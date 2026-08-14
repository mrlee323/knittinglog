/**
 * 신체 치수와 여유분.
 *
 * 계산기들이 매번 "가슴둘레 몇이세요?"를 묻지 않게 하기 위한 기반이다.
 * 매번 재는 게 귀찮아서 대충 뜨다 사이즈가 틀어지는 게 흔한 실패 경로다.
 *
 * 저장은 전부 cm. 인치는 표시할 때만 환산한다.
 */

export interface Measurements {
  /** 가슴둘레 */
  bust?: number;
  waist?: number;
  hip?: number;
  /** 어깨너비 */
  shoulder?: number;
  /** 어깨끝에서 손목까지 */
  armLength?: number;
  /** 위팔 둘레 */
  upperArm?: number;
  /** 뒷목에서 허리까지 */
  backLength?: number;
  headCirc?: number;
  footLength?: number;
  footCirc?: number;
}

export type MeasurementKey = keyof Measurements;

/** 폼과 화면이 같은 순서로 쓰도록 한 곳에 둔다 */
export const MEASUREMENT_KEYS: MeasurementKey[] = [
  "bust",
  "waist",
  "hip",
  "shoulder",
  "armLength",
  "upperArm",
  "backLength",
  "headCirc",
  "footLength",
  "footCirc",
];

/* --- 여유분(ease) --------------------------------------------------------- */

/**
 * 핏 취향. 실측 둘레에 더하는 여유(cm).
 *
 * 음수(네거티브 이즈)가 오타가 아니다. 몸에 붙는 옷은 실제로 몸보다 작게 뜨고
 * 뜨개천의 신축으로 맞춘다. 이걸 모르고 실측대로 뜨면 옷이 헐렁해진다.
 */
export const EASE_PRESETS = [
  { key: "negative", cm: -5 },
  { key: "close", cm: 0 },
  { key: "classic", cm: 5 },
  { key: "relaxed", cm: 10 },
  { key: "oversized", cm: 20 },
] as const;

export type EaseKey = (typeof EASE_PRESETS)[number]["key"];

/** 실측 + 여유 = 완성 치수 */
export function applyEase(actualCm: number, easeCm: number): number {
  const finished = actualCm + easeCm;
  if (finished <= 0) {
    throw new RangeError("여유분을 반영한 완성 치수가 0 이하입니다");
  }
  return finished;
}

/** 완성 치수와 실측에서 여유분을 역산한다 */
export const deriveEase = (finishedCm: number, actualCm: number) =>
  finishedCm - actualCm;

/**
 * 둘레를 평면 조각 너비로 바꾼다.
 *
 * 몸판을 앞뒤로 나눠 뜨면 각 조각은 완성 둘레의 절반이다.
 * 원통으로 뜨면 이 변환이 필요 없다 — 그래서 별도 함수로 둔다.
 */
export function flatPieceWidth(finishedCircumferenceCm: number): number {
  if (finishedCircumferenceCm <= 0) {
    throw new RangeError("둘레는 0보다 커야 합니다");
  }
  return finishedCircumferenceCm / 2;
}

/** 가장 가까운 여유 프리셋. 저장된 값이 어떤 핏인지 보여줄 때 쓴다. */
export function nearestEasePreset(easeCm: number): EaseKey {
  return EASE_PRESETS.reduce((best, preset) =>
    Math.abs(preset.cm - easeCm) < Math.abs(best.cm - easeCm) ? preset : best
  ).key;
}

/* --- 프로필 완성도 -------------------------------------------------------- */

/**
 * 채워진 치수 개수.
 *
 * 전부 재라고 요구하지 않는다. 모자만 뜰 사람에게 발볼은 필요 없다.
 * 계산기는 자기가 필요한 항목만 확인하면 된다.
 */
export const filledCount = (m: Measurements) =>
  MEASUREMENT_KEYS.filter((key) => typeof m[key] === "number" && m[key]! > 0)
    .length;

export const hasMeasurement = (m: Measurements, key: MeasurementKey) =>
  typeof m[key] === "number" && m[key]! > 0;
