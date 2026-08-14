import { describe, expect, it } from "vitest";
import {
  allocatedSkeins,
  forecastYarn,
  freeSkeins,
  isOverAllocated,
  skeinsForMeters,
  stashTotal,
  substituteSkeins,
} from "./yarn";

/** 50g / 125m 타래 6개 */
const STASH = { skeinCount: 6, skeinGrams: 50, skeinMeters: 125 };

describe("보유량", () => {
  it("타래 수로 총 무게와 길이를 낸다", () => {
    expect(stashTotal(STASH)).toEqual({ skeins: 6, grams: 300, meters: 750 });
  });

  it("라벨을 잃어버린 실은 개수만 센다", () => {
    // 무게·길이를 모른 채 등록하는 걸 막지 않는다
    expect(stashTotal({ skeinCount: 3 })).toEqual({
      skeins: 3,
      grams: undefined,
      meters: undefined,
    });
  });

  it("배정된 타래를 합산한다", () => {
    expect(
      allocatedSkeins([{ skeinsAllocated: 2 }, { skeinsAllocated: 1 }])
    ).toBe(3);
    expect(allocatedSkeins([])).toBe(0);
  });

  it("남은 타래를 계산한다", () => {
    expect(freeSkeins(STASH, [{ skeinsAllocated: 2 }])).toBe(4);
  });

  it("과배정을 숨기지 않는다", () => {
    // 가진 것보다 많이 배정한 상태는 사용자가 알아야 할 정보다
    expect(freeSkeins(STASH, [{ skeinsAllocated: 8 }])).toBe(-2);
    expect(isOverAllocated(STASH, [{ skeinsAllocated: 8 }])).toBe(true);
    expect(isOverAllocated(STASH, [{ skeinsAllocated: 6 }])).toBe(false);
  });
});

describe("소요량", () => {
  it("필요 미터를 타래 수로 올림한다", () => {
    // 반 타래를 사올 수는 없다
    expect(skeinsForMeters(750, 125)).toBe(6);
    expect(skeinsForMeters(751, 125)).toBe(7);
    expect(skeinsForMeters(0, 125)).toBe(0);
  });

  it("타래 길이가 0 이하면 거부한다", () => {
    expect(() => skeinsForMeters(100, 0)).toThrow(RangeError);
  });

  it("실을 바꾸면 타래 수가 달라진다 — 길이 기준으로 환산해야 한다", () => {
    // 원래 실 6타래 × 125m = 750m 필요.
    // 대체 실이 타래당 90m면 9타래가 필요하다. 6타래를 그대로 사면 모자란다.
    expect(
      substituteSkeins({ skeins: 6, skeinMeters: 125 }, { skeinMeters: 90 })
    ).toBe(9);
  });

  it("대체 실이 더 길면 타래 수가 줄어든다", () => {
    expect(
      substituteSkeins({ skeins: 6, skeinMeters: 125 }, { skeinMeters: 200 })
    ).toBe(4);
  });
});

describe("잔량 예측", () => {
  it("두 지점에서 단당 소모량을 역산한다", () => {
    // 20단에서 100g → 60단에서 60g. 40단에 40g = 1g/단
    const f = forecastYarn(
      [
        { remainingGrams: 100, atRow: 20 },
        { remainingGrams: 60, atRow: 60 },
      ],
      120,
      60
    );
    expect(f?.gramsPerRow).toBeCloseTo(1);
    expect(f?.rowsLeft).toBe(60);
    expect(f?.enough).toBe(true);
    expect(f?.shortfallRows).toBe(0);
  });

  it("모자라면 몇 단이 부족한지 알려준다", () => {
    // 1g/단인데 32g 남았고 40단을 더 떠야 한다
    const f = forecastYarn(
      [
        { remainingGrams: 72, atRow: 40 },
        { remainingGrams: 32, atRow: 80 },
      ],
      120,
      80
    );
    expect(f?.rowsLeft).toBe(32);
    expect(f?.shortfallRows).toBe(8);
    expect(f?.enough).toBe(false);
  });

  it("한 번만 재면 계산할 수 없다", () => {
    // 얼마나 쓰는지를 알 수 없다
    expect(
      forecastYarn([{ remainingGrams: 100, atRow: 20 }], 120, 20)
    ).toBeNull();
    expect(forecastYarn([], 120, 0)).toBeNull();
  });

  it("실이 줄지 않았으면 계산하지 않는다", () => {
    expect(
      forecastYarn(
        [
          { remainingGrams: 100, atRow: 20 },
          { remainingGrams: 100, atRow: 60 },
        ],
        120,
        60
      )
    ).toBeNull();
  });

  it("잰 순서가 뒤바뀌어 들어와도 정렬해서 계산한다", () => {
    const f = forecastYarn(
      [
        { remainingGrams: 60, atRow: 60 },
        { remainingGrams: 100, atRow: 20 },
      ],
      120,
      60
    );
    expect(f?.gramsPerRow).toBeCloseTo(1);
  });
});
