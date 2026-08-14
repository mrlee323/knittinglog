import { describe, expect, it } from "vitest";
import {
  applyBlockingFactor,
  deriveBlockingFactor,
  lengthForRows,
  resizeToMyGauge,
  roundToRepeat,
  rowsForLength,
  stitchesForWidth,
  suggestNeedle,
  widthForStitches,
  type Gauge,
} from "./gauge";

/** 병태사 메리야스 표준에 가까운 게이지 */
const DK: Gauge = { stitchesPer10cm: 22, rowsPer10cm: 30 };

describe("치수 ↔ 코수", () => {
  it("너비를 코수로 변환한다", () => {
    expect(stitchesForWidth(DK, 50)).toBe(110);
    expect(stitchesForWidth(DK, 10)).toBe(22);
  });

  it("길이를 단수로 변환한다", () => {
    expect(rowsForLength(DK, 60)).toBe(180);
  });

  it("코수·단수를 다시 치수로 되돌린다", () => {
    expect(widthForStitches(DK, 110)).toBeCloseTo(50);
    expect(lengthForRows(DK, 180)).toBeCloseTo(60);
  });

  it("게이지가 0 이하면 거부한다", () => {
    expect(() =>
      stitchesForWidth({ stitchesPer10cm: 0, rowsPer10cm: 30 }, 50)
    ).toThrow(RangeError);
  });
});

describe("무늬 배수 보정", () => {
  it("반복 배수의 가장 가까운 값으로 맞춘다", () => {
    expect(roundToRepeat(110, 4)).toBe(112);
    expect(roundToRepeat(109, 4)).toBe(108);
  });

  it("가장자리 코수를 남긴다", () => {
    // 4코 무늬 + 양끝 2코 → 항상 4의 배수 + 2
    expect(roundToRepeat(110, 4, 2) % 4).toBe(2);
    expect(roundToRepeat(110, 4, 2)).toBe(110);
    expect(roundToRepeat(111, 4, 2)).toBe(110);
    expect(roundToRepeat(113, 4, 2)).toBe(114);
  });

  it("반복이 없으면 반올림만 한다", () => {
    expect(roundToRepeat(110.4, 0)).toBe(110);
  });

  it("0코 이하로 떨어지지 않는다", () => {
    expect(roundToRepeat(1, 6)).toBeGreaterThan(0);
    expect(roundToRepeat(0, 6)).toBeGreaterThan(0);
  });
});

describe("도안 리사이징", () => {
  it("게이지가 같으면 코수가 그대로다", () => {
    const r = resizeToMyGauge(110, 180, { patternGauge: DK, myGauge: DK });
    expect(r.stitches).toBe(110);
    expect(r.rows).toBe(180);
    expect(r.widthDeltaCm).toBeCloseTo(0);
  });

  it("내 게이지가 촘촘하면 코수가 늘어난다", () => {
    // 도안 22코 → 내 24코. 같은 50cm를 만들려면 코가 더 필요하다.
    const r = resizeToMyGauge(110, 180, {
      patternGauge: DK,
      myGauge: { stitchesPer10cm: 24, rowsPer10cm: 32 },
    });
    expect(r.stitches).toBe(120);
    expect(r.rows).toBe(192);
  });

  it("내 게이지가 성글면 코수가 줄어든다", () => {
    const r = resizeToMyGauge(110, 180, {
      patternGauge: DK,
      myGauge: { stitchesPer10cm: 20, rowsPer10cm: 28 },
    });
    expect(r.stitches).toBe(100);
  });

  it("완성 치수를 보존한다 — 리사이징의 존재 이유", () => {
    const myGauge: Gauge = { stitchesPer10cm: 24, rowsPer10cm: 32 };
    const originalWidth = widthForStitches(DK, 110);
    const r = resizeToMyGauge(110, 180, { patternGauge: DK, myGauge });
    expect(widthForStitches(myGauge, r.stitches)).toBeCloseTo(originalWidth, 1);
  });

  it("무늬 배수를 지키고 그 오차를 보고한다", () => {
    const r = resizeToMyGauge(110, 180, {
      patternGauge: DK,
      myGauge: { stitchesPer10cm: 23, rowsPer10cm: 31 },
      repeat: 6,
    });
    expect(r.stitches % 6).toBe(0);
    // 배수로 밀린 만큼 실제 너비가 목표에서 벗어난다
    expect(Math.abs(r.widthDeltaCm)).toBeLessThan(2);
  });
});

describe("블로킹 보정", () => {
  it("블로킹 후 넓어지면 10cm당 코수가 줄어든다", () => {
    const blocked = applyBlockingFactor(DK, { width: 1.1, length: 1.05 });
    expect(blocked.stitchesPer10cm).toBeCloseTo(20);
  });

  it("전/후 실측에서 계수를 역산하고 왕복이 일치한다", () => {
    const after: Gauge = { stitchesPer10cm: 20, rowsPer10cm: 28 };
    const factor = deriveBlockingFactor(DK, after);
    const roundTrip = applyBlockingFactor(DK, factor);
    expect(roundTrip.stitchesPer10cm).toBeCloseTo(after.stitchesPer10cm);
    expect(roundTrip.rowsPer10cm).toBeCloseTo(after.rowsPer10cm);
  });

  it("계수가 0 이하면 거부한다", () => {
    expect(() => applyBlockingFactor(DK, { width: 0, length: 1 })).toThrow(
      RangeError
    );
  });
});

describe("바늘 조정 제안", () => {
  const target: Gauge = { stitchesPer10cm: 22, rowsPer10cm: 30 };

  it("너무 촘촘하면 바늘을 올린다", () => {
    const s = suggestNeedle(
      { stitchesPer10cm: 25, rowsPer10cm: 33 },
      target,
      4.0
    );
    expect(s.direction).toBe("up");
    expect(s.suggestedMm).toBeGreaterThan(4.0);
  });

  it("너무 성글면 바늘을 내린다", () => {
    const s = suggestNeedle(
      { stitchesPer10cm: 19, rowsPer10cm: 27 },
      target,
      4.0
    );
    expect(s.direction).toBe("down");
    expect(s.suggestedMm).toBeLessThan(4.0);
  });

  it("1코 미만 차이는 측정 오차로 보고 조정하지 않는다", () => {
    const s = suggestNeedle(
      { stitchesPer10cm: 22.5, rowsPer10cm: 30 },
      target,
      4.0
    );
    expect(s.direction).toBe("none");
    expect(s.suggestedMm).toBe(4.0);
  });

  it("차이가 클수록 더 크게 조정한다", () => {
    const small = suggestNeedle(
      { stitchesPer10cm: 24, rowsPer10cm: 32 },
      target,
      4.0
    );
    const large = suggestNeedle(
      { stitchesPer10cm: 30, rowsPer10cm: 38 },
      target,
      4.0
    );
    expect(large.suggestedMm).toBeGreaterThan(small.suggestedMm);
  });

  it("사다리 끝에서는 더 제안하지 않는다", () => {
    const s = suggestNeedle(
      { stitchesPer10cm: 40, rowsPer10cm: 50 },
      target,
      25.0
    );
    expect(s.direction).toBe("none");
  });

  it("코바늘 사다리를 쓴다", () => {
    const s = suggestNeedle(
      { stitchesPer10cm: 25, rowsPer10cm: 33 },
      target,
      4.0,
      "crochet"
    );
    expect(s.direction).toBe("up");
    expect(s.suggestedMm).toBeGreaterThan(4.0);
  });
});
