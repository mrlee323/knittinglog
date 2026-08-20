/**
 * 심볼 차트(무늬 도안) — 기획 §13.2 ④, §4의 IR이 실제로 쓰이는 지점.
 *
 * 색상 차트는 칸에 **색**을 담고, 심볼 차트는 칸에 **기법**(겉·안·모아뜨기)을
 * 담는다. 격자·게이지 비율 렌더링은 색상 차트와 같은 것을 쓴다.
 *
 * 심볼 차트가 색상 차트보다 어려운 이유는 셀 내용이 코수를 바꾼다는 점이다.
 * 모아뜨기는 2코를 먹고 1코를 내놓는다. 그래서 두 가지가 따라온다.
 *
 * 1. **코 없음(none) 칸이 필요하다.** 줄임이 있는 무늬는 단마다 코수가 다른데
 *    격자는 직사각형이므로 빈 자리를 메워야 한다. 실제 도안이 쓰는 관습이고,
 *    일반 픽셀 에디터에는 없는 개념이다.
 * 2. **코수를 자동으로 검산할 수 있다.** 이게 §4가 IR로 저장하는 이유다.
 *    "3단에서 코가 하나 모자란다"를 사람이 아니라 계산이 잡아준다.
 *
 * 행 순서 규약은 색상 차트와 같다 — `y = 0`이 첫 단(맨 아래)이다.
 */

import { mirrorOp, stitchDelta, workedOnWs } from "./stitches";
export type { ChartGauge } from "./colorChart";
export { cellAspect } from "./colorChart";

export interface StitchChart {
  width: number;
  height: number;
  /** row-major, `y = 0`이 첫 단(맨 아래). 값은 기법 op. */
  ops: string[];
}

/** 새 차트를 만들 때 채우는 기법. 메리야스가 무늬의 기본 바탕이다. */
export const DEFAULT_OP = "knit";

export function createStitchChart(
  width: number,
  height: number,
  fill: string = DEFAULT_OP
): StitchChart {
  const w = Math.max(1, Math.floor(width));
  const h = Math.max(1, Math.floor(height));
  return { width: w, height: h, ops: new Array(w * h).fill(fill) };
}

export function getOp(chart: StitchChart, x: number, y: number): string {
  if (x < 0 || y < 0 || x >= chart.width || y >= chart.height)
    return DEFAULT_OP;
  return chart.ops[y * chart.width + x] ?? DEFAULT_OP;
}

/** 칸 하나의 기법을 바꾼다. 원본을 바꾸지 않는다. */
export function setOp(
  chart: StitchChart,
  x: number,
  y: number,
  op: string
): StitchChart {
  if (x < 0 || y < 0 || x >= chart.width || y >= chart.height) return chart;
  const i = y * chart.width + x;
  if (chart.ops[i] === op) return chart; // 같은 칸을 다시 찍으면 새 객체를 만들지 않는다
  const ops = chart.ops.slice();
  ops[i] = op;
  return { ...chart, ops };
}

/** 크기를 바꾼다. 아래를 기준으로 유지한다(색상 차트와 같은 이유). */
export function resizeStitchChart(
  chart: StitchChart,
  width: number,
  height: number,
  fill: string = DEFAULT_OP
): StitchChart {
  const next = createStitchChart(width, height, fill);
  const w = Math.min(chart.width, next.width);
  const h = Math.min(chart.height, next.height);
  for (let y = 0; y < h; y += 1)
    for (let x = 0; x < w; x += 1)
      next.ops[y * next.width + x] = getOp(chart, x, y);
  return next;
}

/**
 * 좌우 반전.
 *
 * **격자만 뒤집으면 틀린다.** 기울기가 있는 코는 대응되는 코로 바꿔야 한다 —
 * 오른코모아를 뒤집으면 왼코모아가 되어야 하고, 그림만 뒤집으면 기울기가
 * 반대인 무늬가 나온다. 반대쪽 소매를 대칭으로 뜰 때 이 차이가 드러난다.
 * 색상 차트에서는 없던 문제인데, 색에는 기울기가 없기 때문이다.
 */
export function mirrorStitchChart(chart: StitchChart): StitchChart {
  const ops = new Array<string>(chart.ops.length);
  for (let y = 0; y < chart.height; y += 1)
    for (let x = 0; x < chart.width; x += 1)
      ops[y * chart.width + (chart.width - 1 - x)] = mirrorOp(
        getOp(chart, x, y)
      );
  return { ...chart, ops };
}

/** 이 단을 어느 면에서 뜨는가. 겉면(rs) · 안면(ws). */
export type Side = "rs" | "ws";

/**
 * 도안을 어떻게 뜨는가.
 *
 * 원형 뜨기는 뒤집지 않으므로 모든 단이 겉면이다. 평면 뜨기는 매 단 뒤집어서
 * 겉·안면이 번갈아 나온다. 1단을 어느 면에서 시작하는지는 도안마다 다르다
 * (대개 겉면이지만, 안면부터 시작하는 도안도 있다).
 */
export interface Reading {
  flat: boolean;
  firstSide: Side;
}

/** 원형 뜨기 — 모든 단이 겉면이다 */
export const IN_ROUND: Reading = { flat: false, firstSide: "rs" };

export const other = (side: Side): Side => (side === "rs" ? "ws" : "rs");

/**
 * y단(0부터)을 어느 면에서 뜨는지.
 *
 * 원형이면 뒤집는 일이 없으므로 항상 겉면이다.
 */
export function rowSide(y: number, reading: Reading = IN_ROUND): Side {
  if (!reading.flat) return "rs";
  return y % 2 === 0 ? reading.firstSide : other(reading.firstSide);
}

/**
 * 한 단을 읽는 순서로 늘어놓는다. 기호를 그대로 돌려준다(기법 변환 없음).
 *
 * 겉면 단은 오른쪽에서 왼쪽으로 뜬다. 차트는 완성된 천의 모습으로 그려지므로
 * 읽는 순서는 그리는 순서와 반대다. 안면 단은 뒤집어서 뜨므로 왼쪽에서
 * 오른쪽이다 — 방향은 면이 정하는 사실이라 따로 받는 값이 아니다.
 */
export function rowOps(
  chart: StitchChart,
  y: number,
  side: Side = "rs"
): string[] {
  if (y < 0 || y >= chart.height) return [];
  const row: string[] = [];
  for (let x = 0; x < chart.width; x += 1) row.push(getOp(chart, x, y));
  return side === "rs" ? row.reverse() : row;
}

/** 그린 순서 그대로. 격자를 들여다볼 때 쓴다(뜨는 순서가 아니다). */
export function drawnRow(chart: StitchChart, y: number): string[] {
  if (y < 0 || y >= chart.height) return [];
  const row: string[] = [];
  for (let x = 0; x < chart.width; x += 1) row.push(getOp(chart, x, y));
  return row;
}

export interface OpRun {
  op: string;
  count: number;
}

/**
 * 한 단을 "같은 기법 몇 코" 묶음으로 압축한다. 서술형 도안의 재료다(§4).
 *
 * `none`(코 없음)은 격자를 채우기 위한 칸이고 뜨는 동작이 아니므로 빼놓는다.
 * 남겨두면 "코없음 3코"라는 뜰 수 없는 지시가 도안에 섞인다.
 */
export function opRuns(
  chart: StitchChart,
  y: number,
  side: Side = "rs"
): OpRun[] {
  const runs: OpRun[] = [];
  for (const symbol of rowOps(chart, y, side)) {
    if (symbol === "none") continue;
    // 안면 단에서는 그려진 기호를 그대로 뜨지 않는다 — 도안은 겉에서 본
    // 모습이므로, 겉뜨기 기호는 안뜨기로 떠야 겉에서 겉뜨기로 보인다.
    const op = side === "ws" ? workedOnWs(symbol) : symbol;
    const last = runs[runs.length - 1];
    if (last && last.op === op) last.count += 1;
    else runs.push({ op, count: 1 });
  }
  return runs;
}

/** 기법마다 몇 칸인지. 무늬가 무엇으로 이루어졌는지 한눈에 본다. */
export function opCounts(chart: StitchChart): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const op of chart.ops) counts[op] = (counts[op] ?? 0) + 1;
  return counts;
}

/** 차트에 실제로 쓰인 기법 목록 — 범례에 넣을 것만 고르는 데 쓴다. */
export const usedOps = (chart: StitchChart): string[] =>
  Array.from(new Set(chart.ops)).filter((op) => op !== "none");

export interface RowBalance {
  /** 1부터 시작하는 단 번호 (차트 맨 아래가 1단) */
  row: number;
  /** 이 단이 전단에서 먹는 코수 */
  consumes: number;
  /** 이 단이 끝나면 바늘에 남는 코수 */
  produces: number;
  /** 이 단이 시작될 때 바늘에 있어야 하는 코수 */
  expected: number;
  ok: boolean;
}

export interface ChartBalance {
  rows: RowBalance[];
  /** 1단이 시작될 때 바늘에 있어야 하는 코수 (무늬 1회 기준) */
  startStitches: number;
  /** 다 뜨고 나면 바늘에 남는 코수 */
  finalCount: number;
  ok: boolean;
}

/**
 * 코수 자동 검산 — 기획 §4가 IR로 저장하는 가장 실용적인 이유.
 *
 * 각 단이 먹는 코수가 전단이 내놓은 코수와 맞는지 확인한다. 어긋나면 무늬가
 * 틀린 것이고, 이걸 손으로 세다 놓치면 몇 시간 뜬 뒤에 알게 된다.
 *
 * **무늬 1회 안쪽만 본다.** 실제 시작 코수와 맞는지는 다른 질문이다 — 기호
 * 도안의 격자는 대개 무늬 한 번이고, 그러면 12코 무늬에 시작 코수 146을 넣었을
 * 때 "146코가 있어야 하는데 12코를 쓴다"는 틀린 경고가 난다. 시작 코수가 무늬에
 * 들어맞는지는 `domain/construction.ts`가 맡는다(시접·방식까지 함께 봐야 하므로).
 * 한 질문에 주인을 둘 두면 둘이 서로 다른 말을 한다.
 */
export function verifyChart(chart: StitchChart): ChartBalance {
  const rows: RowBalance[] = [];
  const start = rowConsumes(chart, 0);
  let available = start;

  for (let y = 0; y < chart.height; y += 1) {
    let consumes = 0;
    let produces = 0;
    for (let x = 0; x < chart.width; x += 1) {
      const d = stitchDelta(getOp(chart, x, y));
      consumes += d.consumes;
      produces += d.produces;
    }
    rows.push({
      row: y + 1,
      consumes,
      produces,
      expected: available,
      ok: consumes === available,
    });
    available = produces;
  }

  return {
    rows,
    startStitches: start,
    finalCount: available,
    ok: rows.every((r) => r.ok),
  };
}

function rowConsumes(chart: StitchChart, y: number): number {
  let n = 0;
  for (let x = 0; x < chart.width; x += 1)
    n += stitchDelta(getOp(chart, x, y)).consumes;
  return n;
}

/** 이 무늬를 다 뜨면 실제로 몇 cm가 되는지 (색상 차트와 같은 계산) */
export function stitchChartSizeCm(
  chart: StitchChart,
  gauge: { stitchesPer10cm: number; rowsPer10cm: number }
) {
  return {
    width: (chart.width / gauge.stitchesPer10cm) * 10,
    height: (chart.height / gauge.rowsPer10cm) * 10,
  };
}
