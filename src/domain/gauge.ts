/**
 * 게이지 계산.
 *
 * 이 서비스의 계산 엔진 핵심. 게이지가 안 맞아 다시 계산하기 귀찮다는 이유로
 * 프로젝트가 방치되는 것을 막는 게 목적이므로, 정확도가 곧 신뢰도다.
 */

import { needleLadder, type Craft } from "./units";

export interface Gauge {
  /** 10cm당 코수 */
  stitchesPer10cm: number;
  /** 10cm당 단수 */
  rowsPer10cm: number;
}

/**
 * 기록한 스와치에서 계산에 쓸 게이지를 꺼낸다.
 *
 * **블로킹 후 값이 있으면 그쪽이 기준이다.** 물에 담가 말리면 편물이 자리를
 * 잡으면서 치수가 달라지고, 완성 치수를 정하는 건 그 값이다.
 *
 * 이 한 줄이 여섯 군데에 복사돼 있었다. 규칙이 흩어지면 한 곳만 바뀌고,
 * 그러면 화면마다 다른 코수를 말한다.
 */
export const toGauge = (swatch: {
  stitchesPer10cm: number;
  rowsPer10cm: number;
  blockedStitchesPer10cm?: number;
  blockedRowsPer10cm?: number;
}): Gauge => ({
  stitchesPer10cm: swatch.blockedStitchesPer10cm ?? swatch.stitchesPer10cm,
  rowsPer10cm: swatch.blockedRowsPer10cm ?? swatch.rowsPer10cm,
});

const assertPositive = (g: Gauge) => {
  if (g.stitchesPer10cm <= 0 || g.rowsPer10cm <= 0) {
    throw new RangeError("게이지의 코수·단수는 0보다 커야 합니다");
  }
};

/* --- 치수 ↔ 코수 ---------------------------------------------------------- */

export function stitchesForWidth(gauge: Gauge, widthCm: number): number {
  assertPositive(gauge);
  return Math.round((widthCm / 10) * gauge.stitchesPer10cm);
}

export function rowsForLength(gauge: Gauge, lengthCm: number): number {
  assertPositive(gauge);
  return Math.round((lengthCm / 10) * gauge.rowsPer10cm);
}

export function widthForStitches(gauge: Gauge, stitches: number): number {
  assertPositive(gauge);
  return (stitches / gauge.stitchesPer10cm) * 10;
}

export function lengthForRows(gauge: Gauge, rows: number): number {
  assertPositive(gauge);
  return (rows / gauge.rowsPer10cm) * 10;
}

/* --- 무늬 배수 보정 ------------------------------------------------------- */

/**
 * 무늬 반복 배수에 맞춰 코수를 반올림한다.
 *
 * 예) 4코 1무늬 + 양끝 가장자리 2코 → repeat=4, offset=2 이면
 *     결과는 항상 4의 배수 + 2 가 된다.
 */
export function roundToRepeat(
  stitches: number,
  repeat: number,
  offset = 0
): number {
  if (repeat <= 0) return Math.round(stitches);
  const base = ((offset % repeat) + repeat) % repeat;
  const k = Math.round((stitches - base) / repeat);
  const result = base + k * repeat;
  // 0코 이하로 떨어지면 최소 한 무늬는 남긴다
  return result > 0 ? result : base > 0 ? base : repeat;
}

/* --- 도안 리사이징 -------------------------------------------------------- */

export interface ResizeInput {
  /** 도안에 적힌 게이지 */
  patternGauge: Gauge;
  /** 내 스와치 게이지 */
  myGauge: Gauge;
  /** 무늬 반복 코수 (없으면 생략) */
  repeat?: number;
  /** 반복 외 가장자리 코수 */
  repeatOffset?: number;
}

export interface ResizeResult {
  stitches: number;
  rows: number;
  /** 배수 보정 때문에 생긴 오차(cm). 0이 아니면 사용자에게 보여줄 것. */
  widthDeltaCm: number;
}

/**
 * 도안의 코수·단수를 내 게이지 기준으로 다시 계산한다.
 *
 * 원리는 "도안이 의도한 완성 치수를 유지한다"이다.
 * 도안 코수 → 도안 게이지로 치수 환산 → 내 게이지로 코수 재환산.
 */
export function resizeToMyGauge(
  patternStitches: number,
  patternRows: number,
  input: ResizeInput
): ResizeResult {
  assertPositive(input.patternGauge);
  assertPositive(input.myGauge);

  const targetWidthCm = widthForStitches(input.patternGauge, patternStitches);
  const targetLengthCm = lengthForRows(input.patternGauge, patternRows);

  const rawStitches = stitchesForWidth(input.myGauge, targetWidthCm);
  const stitches = input.repeat
    ? roundToRepeat(rawStitches, input.repeat, input.repeatOffset ?? 0)
    : rawStitches;

  return {
    stitches,
    rows: rowsForLength(input.myGauge, targetLengthCm),
    widthDeltaCm: widthForStitches(input.myGauge, stitches) - targetWidthCm,
  };
}

/* --- 블로킹 보정 ---------------------------------------------------------- */

/**
 * 세탁·블로킹 전 게이지를 블로킹 후 기준으로 환산한다.
 *
 * 뜨는 동안 재는 건 블로킹 전 게이지인데 도안이 요구하는 건 블로킹 후라
 * 이 보정이 없으면 완성품이 통째로 커지거나 작아진다.
 */
export function applyBlockingFactor(
  unblocked: Gauge,
  factor: { width: number; length: number }
): Gauge {
  if (factor.width <= 0 || factor.length <= 0) {
    throw new RangeError("블로킹 계수는 0보다 커야 합니다");
  }
  return {
    stitchesPer10cm: unblocked.stitchesPer10cm / factor.width,
    rowsPer10cm: unblocked.rowsPer10cm / factor.length,
  };
}

/** 블로킹 전/후 스와치 실측으로 계수를 역산한다. */
export function deriveBlockingFactor(before: Gauge, after: Gauge) {
  assertPositive(before);
  assertPositive(after);
  return {
    width: before.stitchesPer10cm / after.stitchesPer10cm,
    length: before.rowsPer10cm / after.rowsPer10cm,
  };
}

/* --- 바늘 조정 제안 ------------------------------------------------------- */

export interface NeedleSuggestion {
  direction: "up" | "down" | "none";
  currentMm: number;
  suggestedMm: number;
  /** 조정 폭(mm). 음수면 가늘게. */
  deltaMm: number;
}

/** 0.5mm 차이가 10cm당 움직이는 코수 (경험칙) */
const STITCHES_PER_HALF_MM = 1.25;

/**
 * 게이지가 안 맞을 때 바늘 호수 조정을 제안한다.
 *
 * 코수가 목표보다 **많으면** 너무 촘촘히 뜬 것이므로 바늘을 **올린다**.
 *
 * 호수 사다리를 인덱스로 오르내리지 않고 mm로 계산한 뒤 스냅하는 이유:
 * 대바늘 표는 US·JP 체계가 섞여 있어 인접 항목의 간격이 균일하지 않다
 * (2.0mm 다음이 2.1mm). 인덱스 이동은 체계에 따라 결과가 달라진다.
 */
export function suggestNeedle(
  actual: Gauge,
  target: Gauge,
  currentMm: number,
  craft: Craft = "knit"
): NeedleSuggestion {
  const diff = actual.stitchesPer10cm - target.stitchesPer10cm;
  const none: NeedleSuggestion = {
    direction: "none",
    currentMm,
    suggestedMm: currentMm,
    deltaMm: 0,
  };

  // 10cm당 1코 미만 차이는 스와치 측정 오차 범위로 본다
  if (Math.abs(diff) < 1) return none;

  const ladder = needleLadder(craft);
  const up = diff > 0;
  const idealMm = currentMm + (diff / STITCHES_PER_HALF_MM) * 0.5;

  // 진행 방향으로만 후보를 남긴다 — 스냅이 제자리로 돌아오면 안 된다
  const candidates = ladder.filter((mm) =>
    up ? mm > currentMm : mm < currentMm
  );
  if (candidates.length === 0) return none;

  const suggestedMm = candidates.reduce((best, mm) =>
    Math.abs(mm - idealMm) < Math.abs(best - idealMm) ? mm : best
  );

  return {
    direction: up ? "up" : "down",
    currentMm,
    suggestedMm,
    deltaMm: Number((suggestedMm - currentMm).toFixed(2)),
  };
}
