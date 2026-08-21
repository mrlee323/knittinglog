import { describe, expect, it } from "vitest";
import {
  hasStitches,
  pieceCounts,
  pieceDrift,
  SUGGESTED_PIECES,
} from "./piece";

const G22 = { stitchesPer10cm: 22, rowsPer10cm: 30 };
const G23 = { stitchesPer10cm: 23, rowsPer10cm: 30 };

describe("pieceCounts — 치수에서 코수를 낸다", () => {
  it("50cm 너비는 22코 게이지로 110코", () => {
    expect(pieceCounts({ widthCm: 50, lengthCm: 60 }, G22)).toEqual({
      stitches: 110,
      rows: 180,
    });
  });

  it("치수가 없는 쪽은 계산하지 않는다 — 0으로 채우지 않는다", () => {
    expect(pieceCounts({ widthCm: 50 }, G22)).toEqual({
      stitches: 110,
      rows: undefined,
    });
    expect(pieceCounts({}, G22)).toEqual({
      stitches: undefined,
      rows: undefined,
    });
  });
});

describe("pieceDrift — 게이지가 바뀐 걸 알아챈다", () => {
  const piece = { widthCm: 50, lengthCm: 60, stitches: 110, rows: 180 };

  it("같은 게이지면 어긋나지 않는다", () => {
    expect(pieceDrift(piece, G22)).toBeNull();
  });

  it("게이지가 바뀌면 양쪽 숫자를 함께 준다", () => {
    // 50cm × 23코/10cm = 115코. 단수 게이지는 그대로라 단은 안 움직인다.
    expect(pieceDrift(piece, G23)).toEqual({
      stitches: { was: 110, now: 115 },
    });
  });

  it("치수를 모르면 어긋남을 알 수 없다 — 비교할 근거가 없다", () => {
    // 코수만 손으로 적어둔 조각
    expect(pieceDrift({ stitches: 110 }, G23)).toBeNull();
  });

  it("단수만 어긋나도 잡는다", () => {
    const tighter = { stitchesPer10cm: 22, rowsPer10cm: 32 };
    expect(pieceDrift(piece, tighter)).toEqual({
      rows: { was: 180, now: 192 },
    });
  });

  it("계획한 코수가 없으면 어긋남이 아니다", () => {
    // 치수만 적어둔 조각은 아직 계산한 적이 없다
    expect(pieceDrift({ widthCm: 50 }, G23)).toBeNull();
  });
});

describe("SUGGESTED_PIECES", () => {
  it("모든 종류에 항목이 있다 — 화면이 undefined를 만나지 않는다", () => {
    const categories = [
      "sweater",
      "hat",
      "socks",
      "shawl",
      "bag",
      "blanket",
      "accessory",
      "other",
    ] as const;
    for (const c of categories) {
      expect(Array.isArray(SUGGESTED_PIECES[c])).toBe(true);
    }
  });

  it("스웨터는 몸판부터 — 뜨는 순서다", () => {
    expect(SUGGESTED_PIECES.sweater[0]).toBe("body");
  });

  it("양말은 다리부터 발로", () => {
    expect(SUGGESTED_PIECES.socks).toEqual(["leg", "foot"]);
  });
});

describe("hasStitches", () => {
  it("코수가 있어야 계산의 입력이 된다", () => {
    expect(hasStitches({ stitches: 110 })).toBe(true);
    expect(hasStitches({ stitches: 0 })).toBe(false);
    expect(hasStitches({ widthCm: 50 })).toBe(false);
  });
});
