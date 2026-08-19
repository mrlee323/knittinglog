/**
 * 사진으로 게이지 재기.
 *
 * **자동 인식이 아니다.** 사진에 크기를 아는 물체를 함께 찍으면 픽셀↔mm 환산이
 * 결정되고, 코는 사용자가 이미 세었으므로 앱은 재기만 하면 된다 — CV가 아니라
 * 산수다(기획 §13.2). 그래서 이 파일에 이미지 처리가 한 줄도 없다.
 *
 * 좌표는 **원본 이미지 기준 픽셀**로 받는다. 화면에 축소해 그린 좌표를 그대로
 * 넣으면 기준 물체와 편물이 같은 비율로 줄어들어 결과는 우연히 맞지만,
 * 확대·회전이 섞이면 조용히 틀어진다. 변환은 화면 쪽 책임이다.
 */

export interface Point {
  x: number;
  y: number;
}

export const pixelDistance = (a: Point, b: Point) =>
  Math.hypot(b.x - a.x, b.y - a.y);

/* --- 기준 물체 ------------------------------------------------------------ */

/**
 * 크기를 아는 물체.
 *
 * 자가 가장 정확하지만 늘 손에 있는 건 아니다. 카드와 동전은 규격이 정해져
 * 있어서 지갑만 있으면 된다 — 뜨개하다 급히 재는 상황에 맞는다.
 */
export interface Reference {
  key: string;
  /** 두 점 사이의 실제 길이(mm) */
  mm: number;
}

export const REFERENCES: Reference[] = [
  // ISO/IEC 7810 ID-1 — 신용카드·체크카드·주민등록증이 모두 이 규격이다
  { key: "card-long", mm: 85.6 },
  { key: "card-short", mm: 53.98 },
  { key: "coin-500", mm: 26.5 },
  { key: "coin-100", mm: 24.0 },
  // 자를 쓸 때는 사용자가 두 눈금 사이 길이를 직접 넣는다
  { key: "custom", mm: 0 },
];

export const findReference = (key: string) =>
  REFERENCES.find((r) => r.key === key);

/**
 * 픽셀당 mm.
 *
 * 기준 물체의 두 점을 잘못 찍으면 여기서 생긴 오차가 결과 전체에 그대로
 * 곱해진다. 그래서 기준은 사진에서 되도록 길게 잡는 게 좋다.
 */
export function mmPerPixel(a: Point, b: Point, knownMm: number): number {
  const px = pixelDistance(a, b);
  if (px <= 0) throw new RangeError("기준 두 점이 같은 자리입니다");
  if (knownMm <= 0) throw new RangeError("기준 길이는 0보다 커야 합니다");
  return knownMm / px;
}

/* --- 게이지 환산 ---------------------------------------------------------- */

export interface MeasureInput {
  /** 기준 물체의 두 점 (원본 이미지 픽셀) */
  refA: Point;
  refB: Point;
  refMm: number;
  /** 편물에서 센 구간의 두 점 */
  spanA: Point;
  spanB: Point;
  /** 그 구간에 들어 있는 코수(또는 단수). 사용자가 센 값. */
  count: number;
}

export interface MeasureResult {
  /** 10cm당 코수(또는 단수) */
  per10cm: number;
  /** 잰 구간의 실제 길이(mm) */
  spanMm: number;
  /**
   * ± 오차. 탭 하나가 몇 픽셀 빗나갈 수 있는지에서 나온다.
   *
   * 이 값을 보여주는 게 중요하다. 코를 몇 개 세는지가 정확도를 좌우한다는 걸
   * 문장으로 설명하는 것보다 숫자가 줄어드는 걸 보여주는 게 빠르다.
   */
  tolerance: number;
}

/** 손가락으로 탭할 때 빗나가는 픽셀. 화면 배율과 무관하게 원본 기준으로 잡는다. */
const TAP_ERROR_PX = 4;

/**
 * 잰 구간과 코수로 10cm당 코수를 낸다.
 *
 * 오차는 기준 물체와 잰 구간 **양쪽의** 상대 오차가 더해진다. 기준을 짧게
 * 잡거나 코를 적게 세면 둘 다 커진다.
 */
export function measureGauge(input: MeasureInput): MeasureResult {
  if (input.count <= 0) throw new RangeError("코수는 0보다 커야 합니다");

  const perPx = mmPerPixel(input.refA, input.refB, input.refMm);
  const spanPx = pixelDistance(input.spanA, input.spanB);
  if (spanPx <= 0) throw new RangeError("잰 두 점이 같은 자리입니다");

  const spanMm = spanPx * perPx;
  const per10cm = (input.count / spanMm) * 100;

  const refPx = pixelDistance(input.refA, input.refB);
  const relative = TAP_ERROR_PX / refPx + TAP_ERROR_PX / spanPx;

  return {
    per10cm,
    spanMm,
    // 표시용으로 소수점 한 자리까지. 게이지는 0.1코 차이가 의미 있다.
    tolerance: Math.round(per10cm * relative * 10) / 10,
  };
}

/**
 * 이 구간으로 재면 오차가 얼마나 될지 미리 알려준다.
 *
 * 코를 더 세라고 권하기 위한 값이다. 실제 코수를 세기 전에도 계산할 수 있어야
 * 하므로 measureGauge와 따로 둔다.
 */
export function toleranceRatio(refPx: number, spanPx: number): number {
  if (refPx <= 0 || spanPx <= 0) return Infinity;
  return TAP_ERROR_PX / refPx + TAP_ERROR_PX / spanPx;
}

/** 게이지 기록에 넣을 수 있게 정수로 다듬는다 */
export const roundGauge = (per10cm: number) => Math.round(per10cm * 10) / 10;
