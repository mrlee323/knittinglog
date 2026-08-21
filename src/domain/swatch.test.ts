import { describe, expect, it } from "vitest";
import {
  gaugeLooksOff,
  per10cm,
  swatchAdvice,
  swatchSizeCm,
  SWATCH_MARGIN_CM,
} from "./swatch";

describe("스와치 크기", () => {
  it("재려는 길이 양옆에 여유를 남긴다", () => {
    // 10cm를 재려면 가장자리를 피해야 하므로 한 변 15cm
    expect(swatchSizeCm()).toBe(10 + SWATCH_MARGIN_CM * 2);
    expect(swatchSizeCm()).toBe(15);
  });
});

describe("swatchAdvice — 몇 코 잡고 얼마나 크게", () => {
  it("병태사(DK)는 34코 · 사방 15cm", () => {
    // gaugeRange [21,24] → 중간 22.5코/10cm → 15cm에 33.75 → 34코
    const a = swatchAdvice(3);
    expect(a.castOn).toBe(34);
    expect(a.sizeCm).toBe(15);
    expect(a.needleMm).toEqual([3.75, 4.5]);
    expect(a.expected).toEqual([21, 24]);
  });

  it("레이스사는 훨씬 많이 잡아야 한다", () => {
    // [33,40] → 중간 36.5 → 15cm에 54.75 → 55코
    expect(swatchAdvice(0).castOn).toBe(55);
  });

  it("굵은 실은 적게 잡는다", () => {
    // 초극태사 [12,15] → 중간 13.5 → 20.25 → 21코
    expect(swatchAdvice(5).castOn).toBe(21);
  });

  it("잡을 코수는 예상 코수의 최소값보다 넉넉하다", () => {
    // 최소값으로 잡으면 스와치가 재려는 폭보다 좁게 나올 수 있다
    for (const cyc of [0, 1, 2, 3, 4, 5] as const) {
      const a = swatchAdvice(cyc);
      expect(a.castOn).toBeGreaterThan((a.expected[0] * a.sizeCm) / 10 - 1);
    }
  });
});

describe("per10cm — 여러 코를 세고 폭을 재는 쪽이 정확하다", () => {
  it("20코가 9.2cm면 10cm당 21.7코", () => {
    expect(per10cm(20, 9.2)).toBe(21.7);
  });

  it("딱 10cm면 센 수가 그대로다", () => {
    expect(per10cm(22, 10)).toBe(22);
  });

  it("잴 수 없는 값은 null이다 — 0으로 나누지 않는다", () => {
    expect(per10cm(20, 0)).toBeNull();
    expect(per10cm(20, -3)).toBeNull();
    expect(per10cm(0, 10)).toBeNull();
  });
});

describe("gaugeLooksOff — 조용히 틀리는 것을 물어본다", () => {
  it("병태사에 22코는 자연스럽다", () => {
    expect(gaugeLooksOff(22, 3)).toBe(false);
  });

  it("인접 등급에 걸치는 값은 경고하지 않는다", () => {
    // 병태사 [21,24]지만 합태사 26코, 극태사 16코까지는 흔하다
    expect(gaugeLooksOff(26, 3)).toBe(false);
    expect(gaugeLooksOff(16, 3)).toBe(false);
  });

  it("두 등급 넘게 벗어나면 물어본다", () => {
    expect(gaugeLooksOff(33, 3)).toBe(true); // 레이스사 수준
    expect(gaugeLooksOff(10, 3)).toBe(true); // 왕초극태사 수준
  });

  it("코와 단을 바꿔 넣은 흔한 실수를 잡는다", () => {
    // 병태사 스와치의 단수는 대개 28~32단. 그걸 코수 칸에 넣으면 걸린다.
    expect(gaugeLooksOff(30, 3)).toBe(true);
  });
});
