import { describe, expect, it } from "vitest";
import {
  countStitches,
  isImpossible,
  planEvenShaping,
  type ShapingPlan,
} from "./shaping";

/** 배치를 도안 문장처럼 읽어 비교한다 — 눈으로 확인하기 쉬운 형태 */
const read = (plan: ShapingPlan) =>
  [
    ...plan.runs.map((r) => `${r.plain}코+증감 ×${r.times}`),
    plan.tail ? `끝 ${plan.tail}코` : null,
  ]
    .filter(Boolean)
    .join(" · ");

const plan = (input: Parameters<typeof planEvenShaping>[0]) => {
  const result = planEvenShaping(input);
  if (isImpossible(result)) throw new Error("배치할 수 없는 입력");
  return result;
};

describe("늘림 배분", () => {
  it("딱 나눠지면 한 종류 구간만 나온다", () => {
    // 원형 60코 → 70코: 늘림 10회, 평코 60을 10구간에 6코씩
    const p = plan({ from: 60, to: 70, inRound: true });
    expect(p.kind).toBe("increase");
    expect(p.changes).toBe(10);
    expect(p.even).toBe(true);
    expect(read(p)).toBe("6코+증감 ×10");
  });

  it("나머지는 앞쪽 구간에 하나씩 얹는다", () => {
    // 원형 64코 → 70코: 늘림 6회, 평코 64 = 11×4 + 10×2 → 앞이 큰 쪽
    const p = plan({ from: 64, to: 70, inRound: true });
    expect(p.even).toBe(false);
    expect(read(p)).toBe("11코+증감 ×4 · 10코+증감 ×2");
    expect(p.runs.reduce((s, r) => s + r.times, 0)).toBe(6);
  });

  it("늘림은 코를 먹지 않는다 — 평코가 그대로 남는다", () => {
    const p = plan({ from: 60, to: 70, inRound: true });
    const plainTotal = p.runs.reduce((s, r) => s + r.plain * r.times, 0);
    expect(plainTotal).toBe(60);
  });
});

describe("줄임 배분", () => {
  it("줄임 하나가 2코를 먹는 걸 계산에 넣는다", () => {
    // 원형 60코 → 50코: 줄임 10회가 20코를 먹고 평코 40이 남아 4코씩
    const p = plan({ from: 60, to: 50, inRound: true });
    expect(p.kind).toBe("decrease");
    expect(p.changes).toBe(10);
    expect(read(p)).toBe("4코+증감 ×10");
    // 평코 40 + 줄임에 쓰인 20 = 60코를 모두 쓴다
    const used =
      p.runs.reduce((s, r) => s + (r.plain + 2) * r.times, 0) + p.tail;
    expect(used).toBe(60);
  });

  it("코수가 모자라면 배치하지 않고 필요한 코수를 알려준다", () => {
    // 20코를 5코로: 줄임 15회 = 30코가 필요하다
    const result = planEvenShaping({ from: 20, to: 5, inRound: true });
    if (!isImpossible(result)) throw new Error("불가능해야 한다");
    expect(result.needed).toBe(30);
    expect(result.available).toBe(20);
  });

  it("절반으로 줄이는 건 가능하다 — 평코가 0이 되는 경계", () => {
    const p = plan({ from: 60, to: 30, inRound: true });
    expect(p.changes).toBe(30);
    expect(read(p)).toBe("0코+증감 ×30");
  });
});

describe("평면과 원형", () => {
  it("평면은 끝에 평코가 남는다", () => {
    // 평면 60코 → 70코: 구간이 11개(늘림 10 + 끝)라 앞 10구간에서 늘린다
    const p = plan({ from: 60, to: 70 });
    expect(p.tail).toBeGreaterThan(0);
    expect(p.runs.reduce((s, r) => s + r.times, 0)).toBe(10);
  });

  it("원형은 끝 평코가 없다 — 마지막 구간이 첫 구간으로 이어진다", () => {
    const p = plan({ from: 60, to: 70, inRound: true });
    expect(p.tail).toBe(0);
  });

  it("가장자리 코는 배분에서 떼어놓는다", () => {
    const p = plan({ from: 60, to: 70, edgeStitches: 2 });
    expect(p.edgeStitches).toBe(2);
    const inner = p.runs.reduce((s, r) => s + r.plain * r.times, 0) + p.tail;
    // 양끝 2코씩을 뺀 56코 안에서만 나눈다
    expect(inner).toBe(56);
  });

  it("원형에는 가장자리가 없다", () => {
    const p = plan({ from: 60, to: 70, inRound: true, edgeStitches: 2 });
    expect(p.edgeStitches).toBe(0);
  });
});

describe("검산", () => {
  it("만든 배치를 되짚으면 목표 코수가 나온다", () => {
    const cases = [
      { from: 60, to: 70, inRound: true },
      { from: 64, to: 70, inRound: true },
      { from: 60, to: 50, inRound: true },
      { from: 88, to: 120 },
      { from: 120, to: 88 },
      { from: 137, to: 96, edgeStitches: 1 },
      { from: 96, to: 137, edgeStitches: 3 },
    ];
    for (const input of cases) {
      const p = plan(input);
      expect(countStitches(p), JSON.stringify(input)).toBe(input.to);
      expect(p.resulting).toBe(input.to);
    }
  });

  it("바꿀 게 없으면 그대로 둔다", () => {
    const p = plan({ from: 60, to: 60, inRound: true });
    expect(p.changes).toBe(0);
    expect(p.runs).toEqual([]);
    expect(countStitches(p)).toBe(60);
  });
});
