import { describe, expect, it } from "vitest";
import {
  colorDistance,
  convertImage,
  downsampleToCells,
  extractPalette,
  fromHex,
  nearestColor,
  toHex,
  type Pixels,
  type RGB,
} from "./imageToChart";

const RED: RGB = { r: 255, g: 0, b: 0 };
const WHITE: RGB = { r: 255, g: 255, b: 255 };
const BLACK: RGB = { r: 0, g: 0, b: 0 };

/** 색 목록으로 RGBA 픽셀 배열을 만든다 (좌→우, 위→아래) */
function makePixels(width: number, height: number, colors: RGB[]): Pixels {
  const data = new Uint8ClampedArray(width * height * 4);
  colors.forEach((c, i) => {
    data[i * 4] = c.r;
    data[i * 4 + 1] = c.g;
    data[i * 4 + 2] = c.b;
    data[i * 4 + 3] = 255;
  });
  return { data, width, height };
}

describe("색 표기", () => {
  it("hex로 바꾸고 되돌린다", () => {
    expect(toHex(RED)).toBe("#ff0000");
    expect(fromHex("#ff0000")).toEqual(RED);
    expect(fromHex("00ff88")).toEqual({ r: 0, g: 255, b: 136 });
  });

  it("소수를 반올림한다", () => {
    expect(toHex({ r: 254.6, g: 0.4, b: 0 })).toBe("#ff0000");
  });

  it("범위를 벗어난 값을 자른다", () => {
    expect(toHex({ r: 300, g: -20, b: 128 })).toBe("#ff0080");
  });

  it("잘못된 형식을 거부한다", () => {
    expect(() => fromHex("빨강")).toThrow(RangeError);
    expect(() => fromHex("#fff")).toThrow(RangeError);
  });
});

describe("색 거리", () => {
  it("같은 색은 0", () => {
    expect(colorDistance(RED, RED)).toBe(0);
  });

  it("가까운 색이 먼 색보다 작다", () => {
    const nearRed = { r: 240, g: 10, b: 10 };
    expect(colorDistance(RED, nearRed)).toBeLessThan(
      colorDistance(RED, { r: 0, g: 0, b: 255 })
    );
  });

  it("팔레트에서 가장 가까운 색을 고른다", () => {
    expect(nearestColor({ r: 250, g: 5, b: 5 }, [WHITE, RED, BLACK])).toBe(1);
    expect(nearestColor({ r: 20, g: 20, b: 20 }, [WHITE, RED, BLACK])).toBe(2);
  });

  it("빈 팔레트를 거부한다", () => {
    expect(() => nearestColor(RED, [])).toThrow(RangeError);
  });
});

describe("칸으로 줄이기", () => {
  it("영역 평균을 낸다 — 중앙 픽셀만 집으면 노이즈가 칸을 결정한다", () => {
    // 2×1 사진을 1×1 칸으로: 흰색과 검정의 평균
    const cells = downsampleToCells(makePixels(2, 1, [WHITE, BLACK]), 1, 1);
    expect(cells[0].r).toBeCloseTo(127.5);
  });

  it("사진 위쪽이 차트의 마지막 단이 된다", () => {
    // 사진: 위 흰색, 아래 검정 (1×2)
    const cells = downsampleToCells(makePixels(1, 2, [WHITE, BLACK]), 1, 2);
    // 차트 y=0(첫 단)은 아래 → 검정
    expect(cells[0]).toEqual({ r: 0, g: 0, b: 0 });
    // 차트 y=1은 위 → 흰색
    expect(cells[1]).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("가로 순서는 그대로다", () => {
    const cells = downsampleToCells(makePixels(2, 1, [BLACK, WHITE]), 2, 1);
    expect(cells[0]).toEqual(BLACK);
    expect(cells[1]).toEqual(WHITE);
  });

  it("칸이 사진보다 많아도 빈 칸을 만들지 않는다", () => {
    // 2×2 사진을 4×4 칸으로 — 각 칸이 최소 한 픽셀은 봐야 한다
    const cells = downsampleToCells(
      makePixels(2, 2, [RED, RED, RED, RED]),
      4,
      4
    );
    expect(cells.length).toBe(16);
    expect(cells.every((c) => c.r === 255)).toBe(true);
  });

  it("투명한 픽셀은 섞지 않는다 — 검정 쪽으로 끌린다", () => {
    const data = new Uint8ClampedArray(2 * 1 * 4);
    // 첫 픽셀 빨강 불투명, 둘째 픽셀 완전 투명
    data.set([255, 0, 0, 255, 0, 0, 0, 0]);
    const cells = downsampleToCells({ data, width: 2, height: 1 }, 1, 1);
    expect(cells[0]).toEqual(RED);
  });

  it("칸 수가 0 이하면 거부한다", () => {
    expect(() => downsampleToCells(makePixels(2, 2, [RED]), 0, 2)).toThrow(
      RangeError
    );
  });
});

describe("팔레트 뽑기", () => {
  it("요청한 개수로 줄인다", () => {
    const colors: RGB[] = [
      { r: 0, g: 0, b: 0 },
      { r: 10, g: 10, b: 10 },
      { r: 250, g: 250, b: 250 },
      { r: 255, g: 255, b: 255 },
    ];
    expect(extractPalette(colors, 2).length).toBe(2);
  });

  it("어두운 무리와 밝은 무리를 나눈다", () => {
    const colors: RGB[] = [
      { r: 5, g: 5, b: 5 },
      { r: 15, g: 15, b: 15 },
      { r: 240, g: 240, b: 240 },
      { r: 250, g: 250, b: 250 },
    ];
    const palette = extractPalette(colors, 2).sort((a, b) => a.r - b.r);
    expect(palette[0].r).toBeLessThan(50);
    expect(palette[1].r).toBeGreaterThan(200);
  });

  it("서로 다른 색이 적으면 있는 것만 돌려준다", () => {
    // 없는 색을 만들어 채우면 쓰이지 않는 팔레트 항목이 생긴다
    expect(extractPalette([RED, RED, WHITE], 5).length).toBe(2);
  });

  it("같은 사진이면 같은 팔레트가 나온다 — 결정적이다", () => {
    const colors: RGB[] = [
      { r: 12, g: 40, b: 200 },
      { r: 200, g: 30, b: 10 },
      { r: 90, g: 200, b: 40 },
      { r: 250, g: 250, b: 100 },
      { r: 30, g: 30, b: 30 },
    ];
    expect(extractPalette(colors, 3)).toEqual(extractPalette(colors, 3));
  });

  it("1개로 줄이면 전체 평균이다", () => {
    const palette = extractPalette([BLACK, WHITE], 1);
    expect(palette.length).toBe(1);
    expect(palette[0].r).toBeCloseTo(127.5);
  });

  it("빈 입력과 0개를 거부한다", () => {
    expect(() => extractPalette([], 2)).toThrow(RangeError);
    expect(() => extractPalette([RED], 0)).toThrow(RangeError);
  });
});

describe("사진 → 차트", () => {
  it("사진에서 팔레트를 뽑아 칸을 채운다", () => {
    const result = convertImage(
      makePixels(2, 2, [WHITE, BLACK, BLACK, WHITE]),
      2,
      2,
      { colorCount: 2 }
    );
    expect(result.palette.length).toBe(2);
    expect(result.cells.length).toBe(4);
    // 대각선 무늬라 두 색이 각각 두 칸씩
    const counts = [0, 1].map(
      (i) => result.cells.filter((c) => c === i).length
    );
    expect(counts.sort()).toEqual([2, 2]);
  });

  it("팔레트를 주면 그 색으로만 맞춘다 — 살 수 있는 실 색으로", () => {
    // 사진은 벽돌색인데 스태시에는 남색과 밤색만 있다.
    // 원색끼리 비교하면 어느 지표로도 애매하므로 분명한 예로 둔다.
    const brick: RGB = { r: 200, g: 60, b: 40 };
    const result = convertImage(makePixels(1, 1, [brick]), 1, 1, {
      palette: ["#101040", "#8b4513"],
    });
    expect(result.palette).toEqual(["#101040", "#8b4513"]);
    // 없는 색을 만들지 않고 가진 것 중 가까운 쪽(밤색)을 고른다
    expect(result.cells).toEqual([1]);
  });

  it("행 순서를 지킨다 — 위아래가 뒤집히면 안 된다", () => {
    // 사진 위쪽 흰색, 아래쪽 검정
    const result = convertImage(makePixels(1, 2, [WHITE, BLACK]), 1, 2, {
      palette: ["#ffffff", "#000000"],
    });
    // 첫 단(cells[0])은 사진 아래쪽 = 검정 = 팔레트 1번
    expect(result.cells[0]).toBe(1);
    expect(result.cells[1]).toBe(0);
  });

  it("빈 팔레트를 주면 사진에서 뽑는다", () => {
    const result = convertImage(makePixels(1, 1, [RED]), 1, 1, { palette: [] });
    expect(result.palette.length).toBe(1);
  });
});
