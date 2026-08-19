import { db } from "@/lib/db";
import {
  BACKUP_APP,
  BACKUP_FORMAT,
  checkBackup,
  decodeRecord,
  encodeRecord,
  planImport,
  type BackupCheck,
  type BackupFile,
  type ImportMode,
  type ImportPlan,
  type TaggedBlob,
} from "@/domain/backup";

/* --- Blob ↔ base64 -------------------------------------------------------- */

/**
 * Blob을 base64로.
 *
 * 조각으로 나눠 돌린다. 큰 사진을 한 번에 `String.fromCharCode(...bytes)`로
 * 넘기면 인자 개수 한도에 걸려 던진다 — 사진 한 장 때문에 백업 전체가 실패한다.
 */
async function toBase64(blob: Blob): Promise<TaggedBlob> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const CHUNK = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return { __t: "blob", type: blob.type, data: btoa(binary) };
}

function fromBase64(tagged: TaggedBlob): Blob {
  const binary = atob(tagged.data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: tagged.type });
}

/* --- 내보내기 ------------------------------------------------------------- */

export interface ExportOptions {
  /** 사진·PDF를 담을지. 용량의 거의 전부가 이것이다. */
  includeMedia: boolean;
  onProgress?: (table: string, index: number, total: number) => void;
}

/**
 * 전체 백업을 파일로 만든다.
 *
 * **JSON 문자열을 한 번에 만들지 않는다.** 사진이 많으면 수십MB짜리 문자열이 되고,
 * 폰에서 그걸 메모리에 올리다 탭이 죽는다. 레코드마다 조각을 만들어 Blob이
 * 이어붙이게 한다.
 *
 * 테이블 목록은 Dexie에서 읽는다 — 손으로 적으면 테이블이 늘 때 백업에서 빠지고,
 * 그건 잃은 뒤에야 알게 된다.
 */
export async function exportBackup(options: ExportOptions): Promise<Blob> {
  const parts: string[] = [];
  // 머리말은 손으로 이어붙인다. JSON.stringify한 객체의 닫는 괄호를 정규식으로
  // 잘라내는 방식은 값에 }가 들어가면 무너진다.
  const head = [
    `"app":${JSON.stringify(BACKUP_APP)}`,
    `"format":${BACKUP_FORMAT}`,
    `"dbVersion":${db.verno}`,
    `"createdAt":${JSON.stringify(new Date().toISOString())}`,
    `"includesMedia":${options.includeMedia}`,
  ].join(",");
  parts.push(`{${head},"tables":{`);

  const tables = db.tables;
  for (const [tableIndex, table] of tables.entries()) {
    parts.push(`${tableIndex === 0 ? "" : ","}${JSON.stringify(table.name)}:[`);
    const rows = await table.toArray();
    for (const [rowIndex, row] of rows.entries()) {
      const encoded = await encodeRecord(row, toBase64, options.includeMedia);
      parts.push(`${rowIndex === 0 ? "" : ","}${JSON.stringify(encoded)}`);
    }
    parts.push("]");
    options.onProgress?.(table.name, tableIndex + 1, tables.length);
  }

  parts.push("}}");
  return new Blob(parts, { type: "application/json" });
}

/** 지금 무엇이 얼마나 들어 있는지 — 내보내기 전에 보여준다 */
export async function countRecords(): Promise<{
  total: number;
  byTable: { table: string; count: number }[];
}> {
  const byTable = await Promise.all(
    db.tables.map(async (table) => ({
      table: table.name,
      count: await table.count(),
    }))
  );
  return {
    total: byTable.reduce((sum, t) => sum + t.count, 0),
    byTable: byTable.filter((t) => t.count > 0),
  };
}

/* --- 가져오기 ------------------------------------------------------------- */

export async function readBackup(file: File): Promise<BackupCheck> {
  try {
    return checkBackup(JSON.parse(await file.text()));
  } catch {
    // JSON이 아니거나 너무 커서 읽지 못했다. 둘 다 "우리 파일이 아니다"로 다룬다 —
    // 사용자가 할 수 있는 일은 같다(다른 파일을 고르는 것).
    return { ok: false, problem: "notBackup" };
  }
}

/**
 * 백업을 기기에 넣는다.
 *
 * **한 트랜잭션에서 한다.** 덮어쓰기는 먼저 비우고 넣으므로, 중간에 실패하면
 * 원래 데이터도 새 데이터도 없는 상태가 된다. 트랜잭션이면 그때 되돌아간다.
 */
export async function applyBackup(
  file: BackupFile,
  mode: ImportMode
): Promise<ImportPlan> {
  const known = await Promise.all(
    db.tables.map(async (table) => ({
      table: table.name,
      // 합치기에서 무엇을 건너뛸지 판단할 근거
      existingIds:
        mode === "merge"
          ? new Set((await table.toCollection().primaryKeys()) as string[])
          : new Set<string>(),
    }))
  );

  const plan = planImport(file, mode, known);
  const byName = new Map(db.tables.map((table) => [table.name, table]));

  await db.transaction("rw", db.tables, async () => {
    // 덮어쓰기는 **모든** 테이블을 비운다. 백업 파일에 있는 것만 비우면, 파일에
    // 없는 테이블의 옛 데이터가 남아서 "덮어쓰기"가 아니게 된다 — 옛 형식의
    // 백업으로 복원했을 때 실제로 그렇게 된다.
    if (mode === "replace") {
      for (const table of db.tables) await table.clear();
    }
    for (const step of plan.tables) {
      const table = byName.get(step.table);
      if (!table || step.add.length === 0) continue;
      const rows = step.add.map((row) => decodeRecord(row, fromBase64));
      await table.bulkPut(rows as never[]);
    }
  });

  return plan;
}
