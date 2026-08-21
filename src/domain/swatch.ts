/**
 * 스와치 안내 — 게이지를 **모르는 사람**을 게이지까지 데려가는 계산.
 *
 * 게이지 화면은 지금까지 "10cm당 코수"를 물었다. 그건 이미 스와치를 뜨고
 * 코를 세어본 사람의 답이다. 처음 뜨는 사람에게 그 칸은 답할 수 없는 질문이고,
 * 답할 수 없는 칸이 첫 화면에 있으면 앱은 거기서 끝난다.
 *
 * 그래서 여기 계산은 **묻지 않고 알려주는 것**을 목표로 한다. 라벨의 그램과
 * 미터는 거의 항상 적혀 있고(`guessWeightFromLabel`), 굵기가 정해지면 권장
 * 바늘과 예상 코수가 따라 나온다. 그 둘이면 "몇 코를 잡고 얼마나 크게 뜨는지"
 * 까지 말해줄 수 있다 — 초보가 막히는 자리는 대개 게이지의 뜻이 아니라
 * **첫 코를 몇 개 잡느냐**다.
 *
 * 여기 값은 전부 **출발점**이다. 실제 게이지는 사람마다 다르고, 그걸 재는 게
 * 스와치의 목적이다. 그래서 이 값으로 계산을 이어가지 않는다 — 스와치를 뜬 뒤
 * 재서 넣은 값만 도안 계산에 쓴다.
 */

import { YARN_WEIGHTS, yarnWeight, type YarnWeightClass } from "./units";

/** 게이지를 재는 기준 길이(cm). 10cm는 도안 관습이다. */
export const MEASURE_CM = 10;

/**
 * 재려는 구간 양옆에 남기는 여유(cm).
 *
 * 메리야스는 가장자리가 안으로 말리고 첫 단·마지막 단은 장력이 다르다.
 * 딱 10cm만 뜨면 잴 수 있는 곳이 없다 — 재는 구간은 편물 가운데여야 한다.
 */
export const SWATCH_MARGIN_CM = 2.5;

/** 스와치 한 변의 길이(cm) */
export const swatchSizeCm = (measureCm: number = MEASURE_CM) =>
  measureCm + SWATCH_MARGIN_CM * 2;

export interface SwatchAdvice {
  /** 권장 바늘 [최소, 최대] mm */
  needleMm: [number, number];
  /** 라벨 기준 예상 10cm당 코수 [최소, 최대] */
  expected: [number, number];
  /** 스와치에 잡을 코수 */
  castOn: number;
  /** 스와치 한 변 (cm) */
  sizeCm: number;
}

/**
 * 실 굵기에서 스와치 출발점을 낸다.
 *
 * 잡을 코수는 예상 코수의 **중간값**으로 잡는다. 최소값을 쓰면 스와치가
 * 재려는 폭보다 좁게 나올 수 있고, 좁으면 다시 떠야 한다 — 한 변을 넉넉히
 * 잡는 쪽의 손해가 훨씬 작다.
 */
export function swatchAdvice(
  weight: YarnWeightClass,
  measureCm: number = MEASURE_CM
): SwatchAdvice {
  const spec = yarnWeight(weight);
  const sizeCm = swatchSizeCm(measureCm);
  const mid = (spec.gaugeRange[0] + spec.gaugeRange[1]) / 2;

  return {
    needleMm: spec.needleRangeMm,
    expected: spec.gaugeRange,
    castOn: Math.ceil((mid * sizeCm) / 10),
    sizeCm,
  };
}

/**
 * 센 코수를 10cm 기준으로 환산한다.
 *
 * 정확히 10cm를 세게 하지 않는 이유가 있다. 10cm 경계가 코 가운데에 걸리면
 * 세는 사람이 반 코를 버릴지 넣을지 정해야 하고, 그 한 코가 스웨터에서는
 * 몇 cm가 된다. **여러 코를 세고 그 폭을 재는 쪽**이 언제나 더 정확하다.
 */
export function per10cm(count: number, cm: number): number | null {
  if (cm <= 0 || count <= 0) return null;
  return Math.round((count / cm) * 10 * 10) / 10;
}

/**
 * 넣은 게이지가 그 실에서 나올 만한 값인가.
 *
 * 초보가 조용히 틀리는 자리다. 화면에 미리 채워진 숫자를 그대로 저장하거나
 * 코와 단을 바꿔 넣으면 이후 모든 계산이 함께 틀리고, 그건 다 뜬 뒤에야
 * 드러난다. 거부하지 않고 **물어본다** — 굵은 바늘로 일부러 느슨하게 뜨는
 * 것도 실제로 하는 일이므로 막으면 안 된다.
 *
 * 범위는 등급 경계에서 딱 끊지 않고 한 등급만큼 넓게 본다. 인접 등급에
 * 걸치는 값은 흔하고, 흔한 값에 경고가 뜨면 경고를 안 보게 된다.
 */
export function gaugeLooksOff(
  stitchesPer10cm: number,
  weight: YarnWeightClass
): boolean {
  const index = YARN_WEIGHTS.findIndex((w) => w.cyc === weight);
  if (index < 0) return false;

  // 배열은 가는 쪽부터다. 가는 실일수록 10cm에 코가 많이 들어간다.
  const finer = YARN_WEIGHTS[index - 1] ?? YARN_WEIGHTS[index];
  const thicker = YARN_WEIGHTS[index + 1] ?? YARN_WEIGHTS[index];
  const min = Math.min(...thicker.gaugeRange, ...finer.gaugeRange);
  const max = Math.max(...thicker.gaugeRange, ...finer.gaugeRange);
  return stitchesPer10cm < min || stitchesPer10cm > max;
}
