import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  fromHex,
  isLight,
  relativeLuminance,
  shade,
  tint,
  toGray,
  toHex,
} from "./color";

describe("hex 읽고 쓰기", () => {
  it("왕복해도 값이 같다", () => {
    expect(toHex(fromHex("#b0603c"))).toBe("#b0603c");
  });

  it("# 없는 형식도 읽는다", () => {
    expect(fromHex("b0603c")).toEqual({ r: 176, g: 96, b: 60 });
  });

  it("짧은 형식은 거부한다 — 잘못된 값이 조용히 검정이 되면 안 된다", () => {
    expect(() => fromHex("#fff")).toThrow(RangeError);
    expect(() => fromHex("실색")).toThrow(RangeError);
  });

  it("범위를 넘는 값은 자른다", () => {
    expect(toHex({ r: 300, g: -20, b: 128 })).toBe("#ff0080");
  });
});

describe("밝게 · 어둡게", () => {
  it("끝값은 흰색과 검정이다", () => {
    expect(tint("#808080", 1)).toBe("#ffffff");
    expect(shade("#808080", 1)).toBe("#000000");
  });

  it("0이면 그대로다", () => {
    expect(tint("#b0603c", 0)).toBe("#b0603c");
    expect(shade("#b0603c", 0)).toBe("#b0603c");
  });
});

describe("isLight — 글자를 얹을 방향", () => {
  it("흰 실은 밝고 먹색 실은 어둡다", () => {
    expect(isLight("#ffffff")).toBe(true);
    expect(isLight("#1b1a18")).toBe(false);
  });

  it("노란색을 어둡다고 보지 않는다 — 단순 평균이 틀리는 지점이다", () => {
    expect(isLight("#ffff00")).toBe(true);
  });
});

describe("상대휘도 — 두 색이 나란히 놓였을 때", () => {
  it("검정은 0, 흰색은 1이다", () => {
    expect(relativeLuminance("#000000")).toBeCloseTo(0);
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1);
  });

  it("초록이 파랑보다 훨씬 밝다 — 사람 눈의 민감도가 그렇다", () => {
    expect(relativeLuminance("#00ff00")).toBeGreaterThan(
      relativeLuminance("#0000ff") * 5
    );
  });

  it("중간 회색의 휘도는 0.5가 아니다 — 감마를 벗겨야 맞다", () => {
    // 감마를 벗기지 않으면 0.5로 나오고, 어두운 색끼리의 차이가 실제보다
    // 크게 계산된다.
    expect(relativeLuminance("#808080")).toBeLessThan(0.3);
  });
});

describe("명도비", () => {
  it("검정과 흰색이 21:1이다", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
  });

  it("같은 색은 1:1이다", () => {
    expect(contrastRatio("#b0603c", "#b0603c")).toBeCloseTo(1);
  });

  it("순서를 바꿔도 같다", () => {
    expect(contrastRatio("#000000", "#b0603c")).toBeCloseTo(
      contrastRatio("#b0603c", "#000000")
    );
  });
});

describe("toGray — 명도만 남긴다", () => {
  it("흰색과 검정은 그대로다", () => {
    expect(toGray("#ffffff")).toBe("#ffffff");
    expect(toGray("#000000")).toBe("#000000");
  });

  it("휘도를 유지한다", () => {
    // 8비트로 반올림하는 만큼(채널 하나 차이)은 어긋난다
    const hex = "#b0603c";
    expect(relativeLuminance(toGray(hex))).toBeCloseTo(
      relativeLuminance(hex),
      2
    );
  });

  it("명도가 같은 두 색은 같은 회색이 된다 — 무늬가 사라지는 이유다", () => {
    // 색상이 정반대여도 명도가 같으면 편물에서 뭉친다
    expect(toGray("#ff0000")).toBe(toGray("#009400"));
  });

  it("무채색이 된다", () => {
    const { r, g, b } = fromHex(toGray("#3c60b0"));
    expect(r).toBe(g);
    expect(g).toBe(b);
  });
});
