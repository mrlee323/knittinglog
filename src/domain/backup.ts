/**
 * 백업 파일의 형식과 병합 규칙 — 기획 §3.13(P0 "데이터 내보내기 — 락인 없음").
 *
 * 이 앱은 계정이 없다. 그래서 **기기를 바꾸거나 브라우저 데이터를 지우면 몇 달치
 * 기록이 사라진다.** "언제 멈췄든 그 자리에서 이어 뜨기"가 전제인 앱에서 그건
 * 기능의 문제가 아니라 신뢰의 문제다.
 *
 * 형식은 JSON이다. 열어볼 수 있고, 다른 도구로 옮길 수 있고, 우리가 없어져도
 * 남는다 — 기획이 "락인 없음"이라고 적은 것이 이 뜻이다.
 */

/** 백업 파일 형식의 버전. 구조를 바꾸면 올린다. */
export const BACKUP_FORMAT = 1;

export const BACKUP_APP = "knittinglog";

export interface BackupFile {
  app: typeof BACKUP_APP;
  format: number;
  /** 만들 때의 Dexie 스키마 버전 — 나중에 마이그레이션 판단에 쓴다 */
  dbVersion: number;
  createdAt: string;
  /** 사진·PDF를 담았는지. 기록만 담은 파일과 구별해야 한다. */
  includesMedia: boolean;
  tables: Record<string, unknown[]>;
}

/* --- 값 변환 -------------------------------------------------------------- */

/**
 * JSON에 담을 수 없는 값을 태그로 감싼다.
 *
 * Blob과 Date가 대상이다. **필드 이름을 열거하지 않는다** — 엔티티에 새 Blob
 * 필드가 생겼을 때 백업에서 조용히 빠지는 것이 가장 나쁜 실패이고, 그건 잃은
 * 뒤에야 알게 된다. 값의 타입을 보고 판단하면 새 필드가 저절로 따라온다.
 *
 * Date도 같은 이유로 태그를 붙인다. JSON.stringify는 Date를 문자열로 만들지만
 * JSON.parse는 되돌리지 못하므로, 어느 필드가 날짜였는지 알아야 한다.
 */
export interface TaggedBlob {
  __t: "blob";
  type: string;
  data: string;
}

export interface TaggedDate {
  __t: "date";
  iso: string;
}

export const isTaggedBlob = (value: unknown): value is TaggedBlob =>
  typeof value === "object" &&
  value !== null &&
  (value as TaggedBlob).__t === "blob";

export const isTaggedDate = (value: unknown): value is TaggedDate =>
  typeof value === "object" &&
  value !== null &&
  (value as TaggedDate).__t === "date";

/** Blob을 문자열로 바꾸는 함수. 화면 계층이 넘긴다(도메인은 브라우저를 모른다). */
export type BlobEncoder = (blob: Blob) => Promise<TaggedBlob>;
export type BlobDecoder = (tagged: TaggedBlob) => Blob;

/**
 * 저장 레코드를 JSON에 담을 수 있는 값으로 바꾼다.
 *
 * `keepMedia`가 false면 Blob을 통째로 뺀다. 사진과 PDF가 용량의 거의 전부이고,
 * 기록만 옮기고 싶은 경우가 실제로 있다(새 기기에서 사진은 두고 오기).
 */
export async function encodeRecord(
  value: unknown,
  encodeBlob: BlobEncoder,
  keepMedia: boolean
): Promise<unknown> {
  if (value instanceof Date) {
    return { __t: "date", iso: value.toISOString() } satisfies TaggedDate;
  }
  if (isBlobLike(value)) {
    return keepMedia ? await encodeBlob(value) : undefined;
  }
  if (Array.isArray(value)) {
    return await Promise.all(
      value.map((item) => encodeRecord(item, encodeBlob, keepMedia))
    );
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      const encoded = await encodeRecord(item, encodeBlob, keepMedia);
      // undefined는 JSON에서 사라지므로 넣지 않는다 — 파일이 조금이라도 작아진다
      if (encoded !== undefined) out[key] = encoded;
    }
    return out;
  }
  return value;
}

/** 태그를 되돌려 저장할 수 있는 레코드로 만든다 */
export function decodeRecord(value: unknown, decodeBlob: BlobDecoder): unknown {
  if (isTaggedDate(value)) return new Date(value.iso);
  if (isTaggedBlob(value)) return decodeBlob(value);
  if (Array.isArray(value)) {
    return value.map((item) => decodeRecord(item, decodeBlob));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = decodeRecord(item, decodeBlob);
    }
    return out;
  }
  return value;
}

/**
 * Blob인지 본다.
 *
 * `instanceof Blob`만 쓰지 않는 이유는 File이 Blob의 하위 타입이라 통과하지만,
 * 워커나 다른 realm에서 온 값은 instanceof가 어긋날 수 있기 때문이다.
 */
function isBlobLike(value: unknown): value is Blob {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Blob).arrayBuffer === "function" &&
    typeof (value as Blob).size === "number"
  );
}

/* --- 파일 확인 ------------------------------------------------------------ */

export type BackupProblem =
  /** 우리 백업 파일이 아니다 */
  | "notBackup"
  /** 더 새 버전의 앱이 만든 파일이다 */
  | "tooNew";

export interface BackupCheck {
  ok: boolean;
  problem?: BackupProblem;
  file?: BackupFile;
}

/**
 * 파일을 받아들일 수 있는지 본다.
 *
 * **더 새 형식은 거부한다.** 모르는 구조를 억지로 읽으면 일부만 들어오고, 그게
 * 성공처럼 보인다 — 사용자는 복원됐다고 믿고 원본을 지운다.
 */
export function checkBackup(parsed: unknown): BackupCheck {
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    (parsed as BackupFile).app !== BACKUP_APP ||
    typeof (parsed as BackupFile).format !== "number" ||
    typeof (parsed as BackupFile).tables !== "object" ||
    (parsed as BackupFile).tables === null
  ) {
    return { ok: false, problem: "notBackup" };
  }
  const file = parsed as BackupFile;
  if (file.format > BACKUP_FORMAT) return { ok: false, problem: "tooNew" };
  return { ok: true, file };
}

/* --- 병합 ---------------------------------------------------------------- */

export type ImportMode = "merge" | "replace";

export interface TablePlan {
  table: string;
  /** 새로 넣을 레코드 */
  add: unknown[];
  /** 이미 있어서 건너뛴 수 */
  skipped: number;
}

export interface ImportPlan {
  mode: ImportMode;
  tables: TablePlan[];
  added: number;
  skipped: number;
  /** 백업 파일에는 있지만 이 앱이 모르는 테이블 */
  unknownTables: string[];
}

/**
 * 무엇을 넣고 무엇을 건너뛸지 정한다.
 *
 * 합치기에서는 **기기에 이미 있는 것을 덮지 않는다.** 같은 id가 있으면 건너뛴다 —
 * 백업을 만든 뒤에 기기에서 더 뜬 기록이 있을 수 있고, 오래된 백업으로 그것을
 * 덮으면 사용자는 뜬 단수를 잃는다. 건너뛴 수는 세어서 알려준다(조용히 넘기면
 * 복원이 덜 됐는지 알 수 없다).
 *
 * 앱이 모르는 테이블은 넣지 않고 이름만 돌려준다. 형식 확인을 통과했는데도
 * 모르는 테이블이 있을 수 있다(같은 format에서 테이블만 추가된 경우).
 */
export function planImport(
  file: BackupFile,
  mode: ImportMode,
  known: { table: string; existingIds: Set<string> }[]
): ImportPlan {
  const byName = new Map(known.map((k) => [k.table, k]));
  const tables: TablePlan[] = [];
  const unknownTables: string[] = [];

  for (const [table, rows] of Object.entries(file.tables)) {
    const target = byName.get(table);
    if (!target) {
      if (Array.isArray(rows) && rows.length > 0) unknownTables.push(table);
      continue;
    }
    if (!Array.isArray(rows)) continue;

    if (mode === "replace") {
      tables.push({ table, add: rows, skipped: 0 });
      continue;
    }

    const add: unknown[] = [];
    let skipped = 0;
    for (const row of rows) {
      const id = (row as { id?: unknown })?.id;
      if (typeof id === "string" && target.existingIds.has(id)) skipped += 1;
      else add.push(row);
    }
    tables.push({ table, add, skipped });
  }

  return {
    mode,
    tables,
    added: tables.reduce((sum, t) => sum + t.add.length, 0),
    skipped: tables.reduce((sum, t) => sum + t.skipped, 0),
    unknownTables,
  };
}

/* --- 저장 공간 ----------------------------------------------------------- */

/** 사람이 읽는 용량. 소수 한 자리면 충분하다 — 정확한 바이트 수는 쓸 데가 없다. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${Math.round(bytes)}B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 ? Math.round(value) : Math.round(value * 10) / 10}${units[unit]}`;
}

export type StorageLevel = "unknown" | "fine" | "tight" | "full";

/**
 * 저장 공간이 얼마나 남았는지.
 *
 * 브라우저가 알려주는 quota는 대략치이고 기기·설정에 따라 크게 다르다. 그래도
 * **비율은 의미가 있다** — 90%를 넘으면 사진 한 장에 저장이 실패할 수 있고,
 * 그때 조용히 실패하면 뜬 기록을 잃는다.
 */
export function storageLevel(estimate: { usage?: number; quota?: number }): {
  level: StorageLevel;
  ratio: number | null;
} {
  const { usage, quota } = estimate;
  if (!usage || !quota || quota <= 0) return { level: "unknown", ratio: null };
  const ratio = usage / quota;
  if (ratio >= 0.9) return { level: "full", ratio };
  if (ratio >= 0.75) return { level: "tight", ratio };
  return { level: "fine", ratio };
}

/** 백업 파일 이름. 날짜가 들어가야 여러 개를 구별할 수 있다. */
export function backupFileName(at: Date, includesMedia: boolean): string {
  const stamp = [
    at.getFullYear(),
    String(at.getMonth() + 1).padStart(2, "0"),
    String(at.getDate()).padStart(2, "0"),
  ].join("");
  return `knittinglog-${stamp}${includesMedia ? "" : "-기록만"}.json`;
}
