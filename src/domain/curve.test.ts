import { describe, expect, it } from "vitest";
import {
  countCurve,
  isImpossible,
  planCurve,
  type CurveInput,
  type CurvePlan,
} from "./curve";

/** 도안 표기로 읽어 비교한다 — 코수-단수-횟수 */
const notation = (plan: CurvePlan) =>
  plan.steps
    .map((s) => `${s.stitches}-${s.rowInterval}-${s.times}`)
    .join(" · ");

const plan = (input: CurveInput) => {
  const result = planCurve(input);
  if (isImpossible(result)) throw new Error("배분할 수 없는 입력");
  return result;
};

describe("코막음 배분", () => {
  it("큰 것부터 작아진다 — 균등하게 나누면 곡선이 아니라 사선이다", () => {
    const p = plan({ stitches: 13, rows: 7 });
    const values = p.steps.flatMap((s) => Array(s.times).fill(s.stitches));
    for (let i = 1; i < values.length; i += 1) {
      expect(values[i]).toBeLessThanOrEqual(values[i - 1]);
    }
  });

  it("첫 코막음을 따로 받는다 — 진동 밑의 평평한 부분", () => {
    // 한쪽 13코, 14단, 첫 코막음 4코, 겉면에서만 줄임
    const p = plan({
      stitches: 13,
      rows: 14,
      firstBindOff: 4,
      everyOtherRow: true,
    });
    expect(p.steps[0]).toEqual({ stitches: 4, rowInterval: 1, times: 1 });
    // 첫 코막음(1단) 뒤 13단에 2단 간격이면 6번 줄인다 — 남은 9코를 그 안에
    expect(notation(p)).toBe("4-1-1 · 2-2-3 · 1-2-3");
    expect(p.stitchesUsed).toBe(13);
    expect(p.rowsUsed).toBe(13);
    expect(p.plainRows).toBe(1);
  });

  it("첫 코막음은 그 단에서 바로 막으므로 간격을 쓰지 않는다", () => {
    const p = plan({ stitches: 6, rows: 6, firstBindOff: 3 });
    expect(p.steps[0].rowInterval).toBe(1);
    expect(countCurve(p).rows).toBe(p.rowsUsed);
  });

  it("겉면에서만 줄이면 두 단마다가 된다", () => {
    const p = plan({ stitches: 5, rows: 10, everyOtherRow: true });
    expect(p.steps.every((s) => s.rowInterval === 2)).toBe(true);
    // 5회 줄임이 2단 간격이면 9단을 쓴다 (첫 줄임 뒤 4번 × 2단)
    expect(p.rowsUsed).toBe(9);
  });
});

describe("남는 단", () => {
  it("줄일 코보다 단이 많으면 1코씩 줄이고 남은 단은 평단으로 둔다", () => {
    const p = plan({ stitches: 4, rows: 12 });
    expect(notation(p)).toBe("1-1-4");
    expect(p.rowsUsed).toBe(4);
    expect(p.plainRows).toBe(8);
  });

  it("0코 줄임은 만들지 않는다", () => {
    const p = plan({ stitches: 3, rows: 20 });
    expect(p.steps.every((s) => s.stitches > 0)).toBe(true);
  });
});

describe("배분할 수 없는 경우", () => {
  it("쓸 단이 아예 없으면 배분하지 않는다", () => {
    const result = planCurve({ stitches: 10, rows: 0 });
    if (!isImpossible(result)) throw new Error("불가능해야 한다");
    expect(result.neededRows).toBe(1);
  });

  it("단수가 빠듯하면 거부하지 않고 급한 배분을 돌려준다", () => {
    // 10코를 6단에 겉면에서만 → 3번밖에 못 줄이니 한 번에 3~4코씩 막는다.
    // 도안이 실제로 하는 일이고, 급하다는 사실은 maxPerStep으로 알린다.
    const p = plan({ stitches: 10, rows: 6, everyOtherRow: true });
    expect(notation(p)).toBe("4-2-1 · 3-2-2");
    expect(p.maxPerStep).toBe(4);
    expect(p.stitchesUsed).toBe(10);
  });

  it("첫 코막음이 총 코수를 넘으면 그만큼만 막는다", () => {
    const p = plan({ stitches: 3, rows: 4, firstBindOff: 8 });
    expect(p.stitchesUsed).toBe(3);
    expect(notation(p)).toBe("3-1-1");
  });
});

describe("검산", () => {
  it("배분을 되짚으면 코수와 단수가 맞는다", () => {
    const cases: CurveInput[] = [
      { stitches: 13, rows: 14, firstBindOff: 4, everyOtherRow: true },
      { stitches: 20, rows: 10 },
      { stitches: 9, rows: 18, everyOtherRow: true },
      { stitches: 7, rows: 7, firstBindOff: 3 },
      { stitches: 24, rows: 12, firstBindOff: 6 },
    ];
    for (const input of cases) {
      const p = plan(input);
      const counted = countCurve(p);
      expect(counted.stitches, JSON.stringify(input)).toBe(p.stitchesUsed);
      expect(counted.rows, JSON.stringify(input)).toBe(p.rowsUsed);
      expect(p.rowsUsed + p.plainRows).toBe(input.rows);
    }
  });

  it("줄일 코가 없으면 전부 평단이다", () => {
    const p = plan({ stitches: 0, rows: 10 });
    expect(p.steps).toEqual([]);
    expect(p.plainRows).toBe(10);
  });
});
