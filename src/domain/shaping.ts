/**
 * 균등 증감 배분.
 *
 * "88코를 120코로 균등하게 늘리기" — 도안이 가장 자주 요구하고 손으로 하기
 * 가장 귀찮은 계산이다. 나눗셈 한 번으로 끝나지 않는 이유가 셋 있다.
 *
 * 1. **줄임은 코를 먹고 늘림은 안 먹는다.** 오른코모아(k2tog)는 2코를 1코로
 *    만들므로 줄임 하나당 평코가 2개 사라진다. 늘림(m1)은 코 사이에서 생기므로
 *    평코를 쓰지 않는다. 같은 "32코 차이"여도 배치가 다르다.
 * 2. **평면과 원형이 다르다.** 원형은 마지막 구간이 첫 구간으로 이어지므로
 *    구간 수가 증감 횟수와 같다. 평면은 끝에 평코가 남아야 하므로 구간이
 *    하나 더 필요하다 — 안 그러면 마지막 코에서 줄임을 하게 되고 가장자리가
 *    지저분해진다.
 * 3. **나머지가 남는다.** 딱 나눠지는 경우는 드물다. 그때는 구간 크기를
 *    두 종류로 섞고, 몇 개가 큰 쪽인지 말해줘야 한다.
 */

export type ShapingKind = "increase" | "decrease";

export interface ShapingInput {
  /** 지금 코수 */
  from: number;
  /** 만들고 싶은 코수 */
  to: number;
  /** 원형으로 뜨는가. 평면이면 양끝에 평코가 남는다. */
  inRound?: boolean;
  /** 평면에서 양끝에 그대로 둘 코 (가장자리) */
  edgeStitches?: number;
}

/** "6코 뜨고 줄임"을 몇 번 반복하는지 */
export interface ShapingRun {
  plain: number;
  times: number;
}

export interface ShapingPlan {
  kind: ShapingKind;
  /** 늘림·줄임 횟수 */
  changes: number;
  /** 앞에서부터 순서대로. 각 묶음은 "plain코 뜨고 증감"을 times번. */
  runs: ShapingRun[];
  /** 마지막 증감 뒤에 남는 평코. 원형이면 0. */
  tail: number;
  edgeStitches: number;
  /** 구간이 한 종류로 딱 나눠졌는가 */
  even: boolean;
  /** 이 배치대로 떴을 때 나오는 코수 — 스스로 검산한 값 */
  resulting: number;
}

/** 코수가 모자라 배치할 수 없는 경우 */
export interface ShapingImpossible {
  kind: ShapingKind;
  changes: number;
  /** 줄임에 필요한 최소 코수 */
  needed: number;
  available: number;
}

export type ShapingResult = ShapingPlan | ShapingImpossible;

export const isImpossible = (r: ShapingResult): r is ShapingImpossible =>
  "needed" in r;

/**
 * 평코를 구간에 나눈다.
 *
 * 나머지는 **앞쪽 구간에 하나씩** 얹는다. 뒤에 얹으면 큰 구간이 끝에 몰려
 * 가장자리가 헐렁해 보인다. 도안이 "처음 몇 번은 6코, 나머지는 5코"로 적는
 * 관습과 같은 순서다.
 */
function distribute(plain: number, gaps: number): ShapingRun[] {
  if (gaps <= 0) return [];
  const base = Math.floor(plain / gaps);
  const remainder = plain % gaps;

  const runs: ShapingRun[] = [];
  if (remainder > 0) runs.push({ plain: base + 1, times: remainder });
  if (gaps - remainder > 0) runs.push({ plain: base, times: gaps - remainder });
  return runs;
}

/**
 * 균등 증감 배치를 만든다.
 *
 * 가장자리 코는 계산에서 먼저 떼어놓는다. 배분은 그 안쪽에서만 하고, 결과를
 * 읽을 때 다시 양끝에 붙는다.
 */
export function planEvenShaping(input: ShapingInput): ShapingResult {
  const { from, to, inRound = false } = input;
  const edgeStitches = inRound ? 0 : Math.max(0, input.edgeStitches ?? 0);

  const kind: ShapingKind = to >= from ? "increase" : "decrease";
  const changes = Math.abs(to - from);
  const available = from - edgeStitches * 2;

  // 줄임은 한 번에 2코를 먹는다. 늘림은 코 사이에서 생기므로 0코.
  const consumed = kind === "decrease" ? changes * 2 : 0;
  const plain = available - consumed;

  if (changes === 0) {
    return {
      kind,
      changes: 0,
      runs: [],
      tail: available,
      edgeStitches,
      even: true,
      resulting: from,
    };
  }

  if (plain < 0) {
    return {
      kind,
      changes,
      needed: changes * 2 + edgeStitches * 2,
      available: from,
    };
  }

  // 원형은 마지막 구간이 첫 구간으로 이어지므로 구간 수 = 증감 횟수.
  // 평면은 끝에 평코를 남기려고 구간을 하나 더 쓴다.
  const gaps = inRound ? changes : changes + 1;
  const spread = distribute(plain, gaps);

  const runs = inRound ? spread : trimLast(spread);
  const tail = inRound ? 0 : lastGap(spread);

  return {
    kind,
    changes,
    runs,
    tail,
    edgeStitches,
    even: spread.length <= 1,
    resulting: kind === "increase" ? from + changes : from - changes,
  };
}

/** 평면의 마지막 구간은 증감 없이 끝나므로 반복 횟수에서 하나 뺀다 */
function trimLast(runs: ShapingRun[]): ShapingRun[] {
  const trimmed = runs.map((run, i) =>
    i === runs.length - 1 ? { ...run, times: run.times - 1 } : run
  );
  return trimmed.filter((run) => run.times > 0);
}

/** 평면에서 끝에 남는 평코 수 */
function lastGap(runs: ShapingRun[]): number {
  const last = runs[runs.length - 1];
  return last ? last.plain : 0;
}

/**
 * 배치가 실제로 목표 코수를 만드는지 다시 센다.
 *
 * 계산기를 믿고 뜨는 사람이 몇 시간을 잃을 수 있으므로, 만든 배치를 그대로
 * 되짚어 검산한다. 화면은 이 값을 그대로 보여준다.
 */
export function countStitches(plan: ShapingPlan): number {
  const worked = plan.runs.reduce(
    (sum, run) =>
      sum + run.times * (run.plain + (plan.kind === "decrease" ? 2 : 0)),
    0
  );
  const made = plan.runs.reduce((sum, run) => sum + run.times, 0);
  const before = worked + plan.tail + plan.edgeStitches * 2;
  return plan.kind === "increase" ? before + made : before - made;
}
