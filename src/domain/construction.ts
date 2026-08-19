/**
 * 평면 ↔ 원형 변환 — 기획 §4의 마지막 축.
 *
 * **차트 자체는 바뀌지 않는다.** 기호 도안은 어느 쪽이든 겉에서 본 모습으로
 * 그리므로, 같은 격자를 평면으로도 원형으로도 뜬다. 서술형 출력이 갈리는 것은
 * 이미 `Reading`이 맡는다.
 *
 * 그럼 무엇을 바꾸는가. **코수와 양끝 처리다.**
 *
 * - 원형은 무늬가 원을 돌아 스스로 이어진다. 그래서 코수가 무늬 반복의
 *   배수여야 하고, 아니면 단 경계에서 무늬가 어긋난다.
 * - 평면은 양끝이 만나지 않는다. 이음선이 생기므로 시접 코가 붙고, 원을 돌아
 *   이어지던 무늬는 양끝에서 끊긴다.
 *
 * 이걸 손으로 계산하다 틀리면 몇 시간 뜬 뒤에 알게 된다 — 코수 검산과 같은
 * 종류의 문제이고, 같은 이유로 계산이 맡는다.
 */

import { createStitchChart, getOp, type StitchChart } from "./stitchChart";

export type Construction = "flat" | "round";

export interface RepeatFit {
  /** 무늬 1회 코수 */
  repeat: number;
  /** 무늬가 놓이는 코수 (시접 제외) */
  motifStitches: number;
  /** 온전히 들어가는 반복 횟수 */
  repeats: number;
  /** 마지막에 남아 끊기는 코수 */
  remainder: number;
  fits: boolean;
}

export function fitRepeat(motifStitches: number, repeat: number): RepeatFit {
  const width = Math.max(0, Math.floor(motifStitches));
  const unit = Math.max(1, Math.floor(repeat));
  const repeats = Math.floor(width / unit);
  const remainder = width - repeats * unit;
  return {
    repeat: unit,
    motifStitches: width,
    repeats,
    remainder,
    // 반복이 한 번도 안 들어가면 나머지가 0이어도 맞는 게 아니다
    fits: remainder === 0 && repeats > 0,
  };
}

/**
 * 변환할 때 달라지는 것들.
 *
 * 문장이 아니라 사유 목록으로 돌려준다 — 화면에서 언어별로 렌더해야 하고
 * (기획 §4), 어떤 사유가 붙었는지 테스트로 확인할 수 있어야 한다.
 */
export type ConversionNote =
  /** 모든 단이 겉면이 된다 */
  | "everyRowRs"
  /** 겉·안면이 번갈아 나온다 */
  | "alternatingSides"
  /** 코수가 무늬 반복의 배수여야 한다 */
  | "mustDivide"
  /** 시접 코를 더한다 */
  | "addSelvedge"
  /** 시접 코를 뺀다 */
  | "dropSelvedge"
  /** 이음선이 생긴다 */
  | "seam"
  /** 원을 돌아 이어지던 무늬가 양끝에서 끊긴다 */
  | "motifBreaks"
  /** 단 경계에서 무늬가 한 코 어긋나 보일 수 있다 */
  | "jog";

export interface ConversionInput {
  /**
   * 지금 어떻게 뜨고 있는가.
   *
   * 사유 목록은 "어디서 어디로"에 달렸다 — 시접을 더하라고 할지 빼라고 할지는
   * 목표만 봐서는 알 수 없다. 같은 방식끼리면 그 방식 자체의 제약만 남는다.
   */
  from: Construction;
  to: Construction;
  /** 무늬 1회 코수 (대개 차트 폭) */
  repeat: number;
  /** 목표 코수 — 원형이면 둘레, 평면이면 폭 */
  total: number;
  /** 평면에서 한쪽에 두는 시접 코. 원형에서는 무시한다. */
  selvedge?: number;
}

export interface ConversionPlan {
  to: Construction;
  /** 목표 코수 */
  total: number;
  /** 실제로 쓰이는 시접 코 (한쪽) */
  selvedge: number;
  fit: RepeatFit;
  /**
   * 딱 맞는 가장 가까운 코수.
   *
   * "안 맞아요"만 말하면 사용자가 다시 계산해야 한다. 반복 하나를 빼거나
   * 더한 값을 함께 주면 그중 하나를 고르면 된다.
   */
  nearest: { down: number | null; up: number };
  notes: ConversionNote[];
}

/** 평면은 양쪽에 시접 코를 둔다. 대개 한 코씩이다. */
export const DEFAULT_SELVEDGE = 1;

export function planConversion(input: ConversionInput): ConversionPlan {
  const to = input.to;
  const total = Math.max(0, Math.floor(input.total));
  // 원형에는 시접이라는 개념이 없다 — 양끝이 만나지 않으므로
  const selvedge =
    to === "flat" ? Math.max(0, Math.floor(input.selvedge ?? DEFAULT_SELVEDGE)) : 0;
  const edges = selvedge * 2;
  const fit = fitRepeat(total - edges, input.repeat);

  // 지금 코수를 내림해서 반복에 맞춘 값
  const floor = fit.repeats * fit.repeat + edges;
  // 위 후보는 늘 "반복 하나 더". 맞을 때든 안 맞을 때든 같은 식이 된다.
  const up = floor + fit.repeat;
  const down = fit.fits
    ? // 이미 맞으므로 아래 후보는 반복 하나 적은 값이다. 반복이 하나뿐이면
      // 더 줄일 수 없다.
      fit.repeats > 1
      ? floor - fit.repeat
      : null
    : // 안 맞으면 내림한 값이 곧 아래 후보다. 반복이 하나도 안 들어가면 없다.
      fit.repeats > 0
      ? floor
      : null;

  return {
    to,
    total,
    selvedge,
    fit,
    nearest: { down, up },
    notes: notesFor(input.from, to),
  };
}

function notesFor(from: Construction, to: Construction): ConversionNote[] {
  if (to === "round") {
    // 원형은 무늬가 원을 돌아 이어져야 하고, 그 이음매가 단 경계다.
    // 이 둘은 평면에서 오든 원형에 머물든 늘 성립한다.
    const notes: ConversionNote[] = ["mustDivide", "jog"];
    if (from === "flat") notes.push("everyRowRs", "dropSelvedge");
    return notes;
  }
  if (from === "round") {
    return ["alternatingSides", "addSelvedge", "seam", "motifBreaks"];
  }
  // 평면에 머무는 경우 — 이음선은 이미 있으므로 새로 알릴 것이 없다
  return [];
}

/**
 * 반복 횟수를 유지하면서 다른 방식의 시작 코수로 옮긴다.
 *
 * 이게 "변환"의 실체다. 무늬는 그대로이고 반복 횟수도 그대로인데, 양끝 처리가
 * 달라서 시작 코수가 달라진다 — 원형 144코(12코 무늬 12회)는 평면에서 146코가
 * 된다(같은 12회 + 시접 2코). 반대로 평면 146코는 원형에서 144코다.
 *
 * 둘레를 유지하는 것이 아니라 **무늬 횟수를 유지한다.** 무늬가 몇 번 도는지가
 * 옷의 인상을 정하고, 시접 2코는 게이지 20코/10cm에서 1cm다.
 */
export function equivalentTotal(input: {
  repeats: number;
  repeat: number;
  to: Construction;
  selvedge?: number;
}): number {
  const body = Math.max(0, Math.floor(input.repeats)) * Math.max(1, Math.floor(input.repeat));
  if (input.to === "round") return body;
  return body + Math.max(0, Math.floor(input.selvedge ?? DEFAULT_SELVEDGE)) * 2;
}

/**
 * 무늬를 목표 코수만큼 늘어놓는다.
 *
 * 반복이 딱 맞지 않으면 **마지막 반복을 끊어서 그대로 보여준다.** 숫자로
 * "3코가 남아요"라고 말하는 것과, 무늬가 어디서 잘리는지 보는 것은 다르다 —
 * 어깨선 한가운데서 잘리는지 무늬 경계에서 잘리는지가 눈으로만 보인다.
 *
 * 시접 코는 겉뜨기로 둔다. 메리야스 시접이 가장 흔하고, 격자에서는 빈 칸이라
 * 무늬와 자연히 구별된다.
 */
export function tileChart(
  chart: StitchChart,
  total: number,
  selvedge = 0
): StitchChart {
  const width = Math.max(1, Math.floor(total));
  const edge = Math.max(0, Math.floor(selvedge));
  const tiled = createStitchChart(width, chart.height, "knit");

  for (let y = 0; y < chart.height; y += 1) {
    for (let x = edge; x < width - edge; x += 1) {
      // 시접을 뺀 안쪽만 무늬로 채운다
      tiled.ops[y * width + x] = getOp(chart, (x - edge) % chart.width, y);
    }
  }
  return tiled;
}
