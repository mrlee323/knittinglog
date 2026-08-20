/**
 * 목선·암홀 곡선 — 코막음 배분.
 *
 * 진동과 목둘레는 한 번에 막지 않는다. 여러 단에 걸쳐 조금씩 줄여야 곡선이
 * 되고, 그 배분을 도안은 **코수-단수-횟수**로 적는다. "4-1-1 · 2-2-3 · 1-2-3"은
 * "4코를 1단에 1번, 2코를 2단마다 3번, 1코를 2단마다 3번"이다.
 *
 * 계산의 요점은 세 가지다.
 *
 * 1. **큰 것부터 줄인다.** 진동 밑은 거의 수평이고 위로 갈수록 완만해진다.
 *    같은 코수를 균등하게 나누면 곡선이 아니라 사선이 된다.
 * 2. **첫 코막음은 따로다.** 진동 시작에서 한 번에 여러 코를 막고(겨드랑이
 *    평평한 부분) 그 뒤부터 1~2코씩 줄인다. 그 첫 값은 도안이 정해주거나
 *    사용자가 안다.
 * 3. **줄일 코보다 단이 많으면 남는 단은 그냥 뜬다.** 0코 줄임 같은 건 없다.
 *    남는 단을 평단으로 돌려주는 게 정직하다.
 */

export interface CurveInput {
  /** 한쪽에서 줄일 총 코수 */
  stitches: number;
  /** 곡선에 쓸 단수 */
  rows: number;
  /** 첫 코막음. 진동 밑의 평평한 부분. */
  firstBindOff?: number;
  /** 겉면에서만 줄이면 2단마다가 된다 */
  everyOtherRow?: boolean;
}

/** 도안 표기 한 묶음: {stitches}코를 {rowInterval}단마다 {times}번 */
export interface CurveStep {
  stitches: number;
  rowInterval: number;
  times: number;
}

export interface CurvePlan {
  steps: CurveStep[];
  /** 배분한 코수 합계 */
  stitchesUsed: number;
  /** 곡선에 쓴 단수 */
  rowsUsed: number;
  /** 곡선 뒤에 줄임 없이 뜨는 단 */
  plainRows: number;
  /**
   * 한 번에 가장 많이 막는 코수(첫 코막음 제외).
   *
   * 단수가 빠듯하면 한 단에 4~5코씩 막게 되는데, 그건 곡선이 아니라 계단이
   * 된다. 막을 수는 있으니 거부하지 않고 이 값을 돌려줘 화면에서 알리게 한다.
   */
  maxPerStep: number;
}

export interface CurveImpossible {
  /** 줄일 코가 있는데 쓸 단이 없다 */
  neededRows: number;
  rows: number;
  stitches: number;
}

export type CurveResult = CurvePlan | CurveImpossible;

export const isImpossible = (r: CurveResult): r is CurveImpossible =>
  "neededRows" in r;

/** 연속으로 같은 코수는 한 묶음으로 접는다 — 도안이 그렇게 적는다 */
function group(values: number[], rowInterval: number): CurveStep[] {
  const steps: CurveStep[] = [];
  for (const stitches of values) {
    const last = steps[steps.length - 1];
    if (
      last &&
      last.stitches === stitches &&
      last.rowInterval === rowInterval
    ) {
      last.times += 1;
    } else {
      steps.push({ stitches, rowInterval, times: 1 });
    }
  }
  return steps;
}

/**
 * 큰 것부터 작아지는 배분을 만든다.
 *
 * 나머지를 앞쪽에 얹는다 — 곡선의 아래쪽이 더 급해야 진동 모양이 된다.
 * 균등 증감(domain/shaping.ts)에서 나머지를 앞에 얹는 것과 이유가 다르다.
 * 거기서는 가장자리가 헐렁해 보이지 않게, 여기서는 곡선의 기울기 때문이다.
 */
function taper(stitches: number, steps: number): number[] {
  if (steps <= 0 || stitches <= 0) return [];
  // 줄일 코가 단보다 적으면 1코씩만 줄이고 나머지 단은 평단으로 남긴다
  if (stitches <= steps) return Array.from({ length: stitches }, () => 1);

  const base = Math.floor(stitches / steps);
  const remainder = stitches % steps;
  return Array.from({ length: steps }, (_, i) =>
    i < remainder ? base + 1 : base
  );
}

export function planCurve(input: CurveInput): CurveResult {
  const stitches = Math.max(0, Math.floor(input.stitches));
  const rows = Math.max(0, Math.floor(input.rows));
  const interval = input.everyOtherRow ? 2 : 1;
  const firstBindOff = Math.max(0, Math.floor(input.firstBindOff ?? 0));

  if (stitches === 0) {
    return {
      steps: [],
      stitchesUsed: 0,
      rowsUsed: 0,
      plainRows: rows,
      maxPerStep: 0,
    };
  }

  // 첫 코막음은 그 자리에서 한 번에 막으므로 1단을 쓴다. 그 뒤부터 간격을 둔다.
  const first = Math.min(firstBindOff, stitches);
  const rest = stitches - first;
  const rowsAfterFirst = rows - (first > 0 ? 1 : 0);

  // 배분할 수 없는 경우는 하나뿐이다 — 줄일 코가 있는데 쓸 단이 없다.
  // 단수가 빠듯한 건 배분이 급해지는 문제이지 불가능한 게 아니다.
  // 한 단에 여러 코를 막는 것도 도안이 실제로 하는 일이다.
  if (rest > 0 && rowsAfterFirst < 1) {
    return { neededRows: (first > 0 ? 1 : 0) + 1, rows, stitches };
  }

  /**
   * 줄일 수 있는 횟수.
   *
   * 첫 코막음이 있으면 그다음 줄임은 간격만큼 뒤에서 시작한다 — 도안 표기
   * "2-2-3"의 2단이 그 간격이다. 첫 코막음이 없으면 첫 줄임은 바로 그 단에서
   * 하므로 한 번을 더 넣을 수 있다. 이 하나 차이로 단수가 어긋난다.
   */
  const slots =
    rest > 0
      ? first > 0
        ? Math.floor(rowsAfterFirst / interval)
        : Math.floor((rowsAfterFirst - 1) / interval) + 1
      : 0;
  const values = taper(rest, slots);

  const steps: CurveStep[] = [
    ...(first > 0 ? [{ stitches: first, rowInterval: 1, times: 1 }] : []),
    ...group(values, interval),
  ];

  const taperRows =
    values.length === 0
      ? 0
      : first > 0
        ? values.length * interval
        : (values.length - 1) * interval + 1;
  const rowsUsed = (first > 0 ? 1 : 0) + taperRows;

  return {
    steps,
    stitchesUsed: first + values.reduce((sum, v) => sum + v, 0),
    rowsUsed,
    plainRows: rows - rowsUsed,
    maxPerStep: values.length > 0 ? Math.max(...values) : 0,
  };
}

/**
 * 배분을 되짚어 코수와 단수를 다시 센다.
 *
 * 곡선을 잘못 배분하면 진동 깊이나 어깨 너비가 틀어지는데, 그건 다 뜬 뒤에야
 * 드러난다. 그래서 화면에 검산값을 함께 보여준다.
 */
export function countCurve(plan: CurvePlan): {
  stitches: number;
  rows: number;
} {
  const stitches = plan.steps.reduce((sum, s) => sum + s.stitches * s.times, 0);
  const rows = plan.steps.reduce(
    (sum, s, i) =>
      // 첫 묶음의 첫 번째는 그 단에서 바로 막으므로 간격을 세지 않는다
      sum + s.times * s.rowInterval - (i === 0 ? s.rowInterval - 1 : 0),
    0
  );
  return { stitches, rows };
}
