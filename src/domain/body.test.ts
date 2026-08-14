import { describe, expect, it } from "vitest";
import {
  applyEase,
  deriveEase,
  EASE_PRESETS,
  filledCount,
  flatPieceWidth,
  hasMeasurement,
  MEASUREMENT_KEYS,
  nearestEasePreset,
} from "./body";

describe("여유분", () => {
  it("실측에 여유를 더해 완성 치수를 낸다", () => {
    expect(applyEase(96, 8)).toBe(104);
  });

  it("음수 여유를 허용한다 — 오타가 아니라 핏이다", () => {
    // 몸에 붙는 옷은 몸보다 작게 뜨고 뜨개천의 신축으로 맞춘다
    expect(applyEase(96, -5)).toBe(91);
    expect(EASE_PRESETS.some((p) => p.cm < 0)).toBe(true);
  });

  it("완성 치수가 0 이하가 되면 거부한다", () => {
    expect(() => applyEase(96, -96)).toThrow(RangeError);
    expect(() => applyEase(96, -100)).toThrow(RangeError);
  });

  it("여유분을 역산한다", () => {
    expect(deriveEase(104, 96)).toBe(8);
    expect(deriveEase(91, 96)).toBe(-5);
  });

  it("가장 가까운 핏 프리셋을 찾는다", () => {
    expect(nearestEasePreset(0)).toBe("close");
    expect(nearestEasePreset(6)).toBe("classic");
    expect(nearestEasePreset(-4)).toBe("negative");
    expect(nearestEasePreset(18)).toBe("oversized");
  });
});

describe("평면 조각", () => {
  it("둘레를 앞뒤 조각 너비로 나눈다", () => {
    expect(flatPieceWidth(104)).toBe(52);
  });

  it("둘레가 0 이하면 거부한다", () => {
    expect(() => flatPieceWidth(0)).toThrow(RangeError);
  });
});

describe("프로필 완성도", () => {
  it("채워진 치수만 센다", () => {
    expect(filledCount({ bust: 96, waist: 78 })).toBe(2);
    expect(filledCount({})).toBe(0);
  });

  it("0이나 음수는 채운 것으로 보지 않는다", () => {
    expect(filledCount({ bust: 0, waist: -1, hip: 92 })).toBe(1);
  });

  it("항목별로 확인한다 — 모자만 뜰 사람에게 발볼은 필요 없다", () => {
    const m = { headCirc: 56 };
    expect(hasMeasurement(m, "headCirc")).toBe(true);
    expect(hasMeasurement(m, "footCirc")).toBe(false);
  });

  it("키 목록에 중복이 없다", () => {
    expect(new Set(MEASUREMENT_KEYS).size).toBe(MEASUREMENT_KEYS.length);
  });
});
