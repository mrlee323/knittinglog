/**
 * 도안 파일 — 서버 없이 도안을 주고받는다 (LOUNGE.md 0단계).
 *
 * 라운지를 만들기 전에 **서버·계정·DB 없이** 도안 공유가 성립한다. 도안 하나를
 * 파일로 내보내 카톡·메일로 보내고, 받는 사람은 공유하기로 우리 앱에 넣는다.
 * 서버가 주는 것은 **발견**뿐이고, 그게 필요해지기 전에는 두지 않는다.
 *
 * 봉투는 백업 파일과 같은 형식을 쓴다(`app`·`format`·`tables`). 인코딩·형식 확인·
 * 병합 계획을 그대로 재사용할 수 있고, 백업 가져오기에 도안 파일을 넣어도 그
 * 도안만 들어온다. 구별은 `kind` 하나로 한다.
 */

import { BACKUP_APP, BACKUP_FORMAT, type BackupFile } from "./backup";

export const PATTERN_KIND = "pattern";

/** 도안이 담기는 테이블. 봉투 안의 위치를 한 곳에 적어둔다. */
export const PATTERN_TABLE = "stitchCharts";

export interface PatternFile extends BackupFile {
  kind: typeof PATTERN_KIND;
}

/**
 * 도안 파일인가, 전체 백업인가.
 *
 * `kind`가 없는 파일은 백업으로 본다 — 이 필드가 생기기 전에 만든 백업이 그렇다.
 * 도안 받기에 전체 백업을 넣었을 때 조용히 도안만 꺼내오지 않고 **어느 화면으로
 * 가야 하는지 말해줄 수 있어야** 하므로, 구별이 필요하다.
 */
export const isPatternFile = (file: BackupFile): boolean =>
  (file as PatternFile).kind === PATTERN_KIND;

/** 봉투에서 도안 레코드들을 꺼낸다 */
export function patternsIn(file: BackupFile): unknown[] {
  const rows = file.tables?.[PATTERN_TABLE];
  return Array.isArray(rows) ? rows : [];
}

/**
 * 보낸 사람의 맥락을 떼어낸다.
 *
 * **이걸 하지 않으면 끊긴 참조가 들어온다.** 공유된 도안의 `gaugeId`는 보낸 사람의
 * 게이지를 가리키는데 내 기기에는 그 게이지가 없다. `projectId`도 마찬가지다.
 * 그 상태로 넣으면 완성 모양이 계산되지 않거나 없는 프로젝트에 매달린다.
 *
 * `castOn`도 뗀다 — "이 무늬를 몇 코에 얹을지"는 보낸 사람의 옷 치수이고, 받는
 * 사람의 것이 아니다. 무늬 자체(코수·단수·기법·평면/원형)만 남긴다.
 */
export function stripContext<T extends Record<string, unknown>>(
  chart: T
): Omit<T, "gaugeId" | "projectId" | "castOn"> {
  return omit(chart, ["gaugeId", "projectId", "castOn"]);
}

/** 키를 빼고 새 객체를 만든다. 원본은 바꾸지 않는다. */
function omit<T extends Record<string, unknown>, K extends string>(
  value: T,
  keys: readonly K[]
): Omit<T, K> {
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (!(keys as readonly string[]).includes(key)) out[key] = item;
  }
  return out as Omit<T, K>;
}

/**
 * 받은 도안에 붙일 이름.
 *
 * 같은 도안을 두 번 받는 일은 실제로 생긴다(단체방에 다시 올라온 파일). 이름이
 * 같으면 목록에서 어느 것이 방금 받은 것인지 알 수 없으므로 번호를 붙인다.
 */
export function receivedName(
  original: string,
  taken: readonly string[],
  suffix: string
): string {
  const base = `${original.trim() || "도안"} (${suffix})`;
  if (!taken.includes(base)) return base;
  for (let n = 2; n < 100; n += 1) {
    const candidate = `${original.trim() || "도안"} (${suffix} ${n})`;
    if (!taken.includes(candidate)) return candidate;
  }
  return base;
}

/** 받아들일 수 있는 도안의 모습 */
export interface SharedChart {
  name: string;
  width: number;
  height: number;
  ops: string[];
  flat?: boolean;
  firstRowSide?: "rs" | "ws";
  notes?: string;
}

/**
 * 받은 값이 실제로 도안인지 확인한다.
 *
 * **파일은 신뢰할 수 없는 입력이다.** 남이 보낸 것이고, 손으로 고쳤을 수도 있고,
 * 다른 앱이 만든 같은 확장자일 수도 있다.
 *
 * 특히 `ops.length`가 `width × height`와 맞는지 본다. 어긋나면 격자 렌더러가
 * 없는 칸을 읽고, 화면이 깨지거나 조용히 빈 도안이 된다 — 사진→차트 변환에서
 * 같은 실수를 이미 한 번 했다.
 */
export function readSharedChart(value: unknown): SharedChart | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;

  const width = Math.floor(Number(v.width));
  const height = Math.floor(Number(v.height));
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  // 상한을 둔다. 10만 칸짜리 파일을 받아 격자를 그리면 화면이 멈춘다.
  if (width < 1 || height < 1 || width > 200 || height > 400) return null;

  if (!Array.isArray(v.ops)) return null;
  if (v.ops.length !== width * height) return null;
  if (!v.ops.every((op) => typeof op === "string")) return null;

  const side = v.firstRowSide;
  return {
    // 이름은 없으면 채운다. 이름이 없는 것은 못 쓸 이유가 아니다.
    name: typeof v.name === "string" && v.name.trim() ? v.name : "받은 도안",
    width,
    height,
    ops: v.ops as string[],
    flat: typeof v.flat === "boolean" ? v.flat : undefined,
    firstRowSide: side === "rs" || side === "ws" ? side : undefined,
    notes: typeof v.notes === "string" ? v.notes : undefined,
  };
}

/** 내보낼 봉투를 만든다. 파일 쓰기는 화면 계층이 한다. */
export function patternEnvelope(encodedChart: unknown, at: Date): PatternFile {
  return {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    kind: PATTERN_KIND,
    dbVersion: 0,
    createdAt: at.toISOString(),
    // 도안에는 사진이 없다. 이 값은 봉투 형식을 맞추기 위한 것이다.
    includesMedia: false,
    tables: { [PATTERN_TABLE]: [encodedChart] },
  };
}

/**
 * 도안 파일 이름.
 *
 * 확장자를 `.json`으로 둔다. 공유 시트가 MIME 타입만으로 판단하지 않는 경우가
 * 있고(안드로이드), 받는 사람이 파일 목록에서 알아볼 수 있어야 한다.
 */
export function patternFileName(name: string): string {
  const safe = name
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
  return `${safe || "도안"}.knit.json`;
}
