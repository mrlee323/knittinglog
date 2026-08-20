import { db, stamp } from "@/lib/db";
import { checkBackup, decodeRecord, encodeRecord } from "@/domain/backup";
import {
  isPatternFile,
  readSharedChart,
  patternEnvelope,
  patternFileName,
  patternsIn,
  receivedName,
  stripContext,
} from "@/domain/patternFile";
import type { Id, StitchChartRecord } from "@/types/entities";

/**
 * 도안을 파일로 주고받는다 — LOUNGE.md 0단계.
 *
 * 서버도 계정도 없다. 내보내 보내고, 받아 넣는다. 라운지의 존재 이유(받아서 바로
 * 뜨기, 코수 검산과 한↔영 서술형이 함께 오기)가 여기서 이미 성립한다.
 */

/** 도안에는 Blob이 없다. 인코더는 형식을 맞추기 위한 자리다. */
const noBlobs = () => {
  throw new Error("도안에는 사진이 없습니다");
};

export async function exportPattern(record: StitchChartRecord): Promise<{
  blob: Blob;
  fileName: string;
}> {
  // 보내는 쪽에서 미리 맥락을 뗀다. 받는 쪽에서도 떼지만(§stripContext), 파일에
  // 내 게이지 id가 남아 있을 이유가 없다 — 남에게 줄 파일이다.
  const encoded = await encodeRecord(
    stripContext({ ...record }),
    noBlobs,
    false
  );
  const file = patternEnvelope(encoded, new Date());
  return {
    blob: new Blob([JSON.stringify(file)], { type: "application/json" }),
    fileName: patternFileName(record.name),
  };
}

export type ImportProblem =
  /** 우리 파일이 아니다 */
  | "notPattern"
  /** 전체 백업 파일이다 — 설정에서 가져와야 한다 */
  | "isBackup"
  /** 더 새 버전이 만든 파일 */
  | "tooNew";

export interface ImportResult {
  ok: boolean;
  problem?: ImportProblem;
  /** 넣은 도안들 */
  added?: { id: Id; name: string }[];
}

/**
 * 도안 파일을 읽어 내 목록에 넣는다.
 *
 * **새 id로 넣는다.** 보낸 사람의 id를 그대로 쓰면 같은 도안을 다시 받았을 때
 * 내가 고쳐둔 것을 덮어쓴다. 받은 것은 사본이므로 내 것으로 들어와야 한다.
 */
export async function importPatternFile(file: File): Promise<ImportResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    return { ok: false, problem: "notPattern" };
  }

  const check = checkBackup(parsed);
  if (!check.ok || !check.file) {
    return {
      ok: false,
      problem: check.problem === "tooNew" ? "tooNew" : "notPattern",
    };
  }
  // 도안 받기에 전체 백업을 넣었을 때 조용히 도안만 꺼내오지 않는다. 어느 화면으로
  // 가야 하는지 말해줄 수 있어야 한다.
  if (!isPatternFile(check.file)) return { ok: false, problem: "isBackup" };

  const rows = patternsIn(check.file);
  if (rows.length === 0) return { ok: false, problem: "notPattern" };

  const taken = (await db.stitchCharts.toArray()).map((c) => c.name);
  const added: { id: Id; name: string }[] = [];

  for (const row of rows) {
    const decoded = decodeRecord(row, noBlobs);
    // 파일은 신뢰할 수 없는 입력이다. 모양을 확인하고 받아들인다.
    const chart = readSharedChart(
      stripContext(decoded as Record<string, unknown>)
    );
    if (!chart) continue;

    const name = receivedName(chart.name, taken, RECEIVED_SUFFIX);
    taken.push(name);

    // id·시각은 새로 받는다. 보낸 사람의 id를 그대로 쓰면 같은 도안을 다시
    // 받았을 때 내가 고쳐둔 것을 덮어쓴다.
    const record = stamp({ ...chart, name }) as StitchChartRecord;
    await db.stitchCharts.add(record);
    added.push({ id: record.id, name });
  }

  // 하나도 못 읽었으면 성공이 아니다
  if (added.length === 0) return { ok: false, problem: "notPattern" };
  return { ok: true, added };
}

/**
 * 받은 도안 이름에 붙는 말.
 *
 * i18n을 도메인에 넣지 않으려고 여기 둔다. 파일 이름이 아니라 목록에 보이는
 * 이름이므로 한국어로 둔다 — 영문 사용자에게는 어색하지만, 이름은 사용자가
 * 바로 고칠 수 있고 그게 이름의 성질이다.
 */
const RECEIVED_SUFFIX = "받음";
