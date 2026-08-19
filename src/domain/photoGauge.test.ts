import { describe, expect, it } from "vitest";
import {
  findReference,
  measureGauge,
  mmPerPixel,
  pixelDistance,
  REFERENCES,
  roundGauge,
  toleranceRatio,
  type MeasureInput,
} from "./photoGauge";

const P = (x: number, y: number) => ({ x, y });

describe("픽셀 거리", () => {
  it("대각선도 잰다 — 기준 물체가 비뚤게 놓이는 게 정상이다", () => {
    expect(pixelDistance(P(0, 0), P(3, 4))).toBe(5);
  });

  it("같은 점이면 0", () => {
    expect(pixelDistance(P(10, 10), P(10, 10))).toBe(0);
  });
});

describe("기준 물체", () => {
  it("신용카드 규격을 쓴다 — 지갑만 있으면 된다", () => {
    // ISO/IEC 7810 ID-1
    expect(findReference("card-long")?.mm).toBe(85.6);
    expect(findReference("card-short")?.mm).toBe(53.98);
  });

  it("동전 규격도 담는다", () => {
    expect(findReference("coin-500")?.mm).toBe(26.5);
    expect(findReference("coin-100")?.mm).toBe(24.0);
  });

  it("자를 쓸 때는 사용자가 직접 넣는다", () => {
    expect(findReference("custom")?.mm).toBe(0);
  });

  it("키가 중복되지 않는다", () => {
    const keys = REFERENCES.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("픽셀당 mm", () => {
  it("기준 길이를 픽셀 거리로 나눈다", () => {
    // 카드 긴 변 85.6mm가 856픽셀로 찍혔다면 1픽셀 = 0.1mm
    expect(mmPerPixel(P(0, 0), P(856, 0), 85.6)).toBeCloseTo(0.1);
  });

  it("두 점이 같으면 거부한다", () => {
    expect(() => mmPerPixel(P(5, 5), P(5, 5), 85.6)).toThrow(RangeError);
  });

  it("기준 길이가 0 이하면 거부한다", () => {
    expect(() => mmPerPixel(P(0, 0), P(100, 0), 0)).toThrow(RangeError);
  });
});

describe("게이지 환산", () => {
  /** 카드 긴 변이 856px(=1px 0.1mm), 20코가 500px(=50mm)에 들어 있다 */
  const base: MeasureInput = {
    refA: P(0, 0),
    refB: P(856, 0),
    refMm: 85.6,
    spanA: P(100, 200),
    spanB: P(600, 200),
    count: 20,
  };

  it("잰 구간과 코수로 10cm당 코수를 낸다", () => {
    const r = measureGauge(base);
    expect(r.spanMm).toBeCloseTo(50);
    // 50mm에 20코 → 100mm에 40코
    expect(r.per10cm).toBeCloseTo(40);
  });

  it("같은 편물을 더 넓게 재도 결과가 같다", () => {
    // 40코가 1000px(=100mm)에 들어 있다 → 여전히 10cm당 40코
    const wider = measureGauge({
      ...base,
      spanB: P(1100, 200),
      count: 40,
    });
    expect(wider.per10cm).toBeCloseTo(40);
  });

  it("코를 더 많이 세면 오차가 줄어든다 — 이게 이 화면의 핵심이다", () => {
    const few = measureGauge(base);
    const many = measureGauge({ ...base, spanB: P(1100, 200), count: 40 });
    expect(many.tolerance).toBeLessThan(few.tolerance);
  });

  it("기준 물체를 짧게 잡으면 오차가 커진다", () => {
    const longRef = measureGauge(base);
    // 같은 카드를 짧은 변으로 찍으면 기준 픽셀이 짧아진다
    const shortRef = measureGauge({
      ...base,
      refB: P(540, 0),
      refMm: 53.98,
    });
    expect(shortRef.tolerance).toBeGreaterThan(longRef.tolerance);
  });

  it("비뚤게 놓인 기준도 대각선 거리로 처리한다", () => {
    const tilted = measureGauge({
      ...base,
      refA: P(0, 0),
      refB: P(600, 800), // 대각선 1000px
      refMm: 100,
    });
    // 1px = 0.1mm, 구간 500px = 50mm, 20코 → 40코/10cm
    expect(tilted.per10cm).toBeCloseTo(40);
  });

  it("코수가 0 이하면 거부한다", () => {
    expect(() => measureGauge({ ...base, count: 0 })).toThrow(RangeError);
  });

  it("잰 두 점이 같으면 거부한다", () => {
    expect(() => measureGauge({ ...base, spanB: base.spanA })).toThrow(
      RangeError
    );
  });
});

describe("오차 미리 보기", () => {
  it("구간이 길수록 작아진다", () => {
    expect(toleranceRatio(856, 1000)).toBeLessThan(toleranceRatio(856, 500));
  });

  it("잴 수 없으면 무한", () => {
    expect(toleranceRatio(0, 500)).toBe(Infinity);
    expect(toleranceRatio(856, 0)).toBe(Infinity);
  });
});

describe("표시용 다듬기", () => {
  it("소수점 한 자리로 — 게이지는 0.1코가 의미 있다", () => {
    expect(roundGauge(21.94)).toBe(21.9);
    expect(roundGauge(22.0)).toBe(22);
  });
});
