/**
 * 사진 → 색상 차트.
 *
 * 기획 §13.2의 ③. 사진의 색을 팔레트로 줄이고 칸으로 옮긴다.
 *
 * **뜨개에서 중요한 건 "살 수 있는 색"이다.** 일반 이미지→픽셀아트 도구는
 * 사진에서 뽑은 임의의 색을 주는데, 그 색 실은 존재하지 않는다. 그래서 팔레트를
 * 고정할 수 있게 만들었다 — 스태시에 있는 실 색을 넘기면 가진 실로만 맞춘다.
 *
 * DOM에 의존하지 않는다. 픽셀은 평평한 배열로 받고, 캔버스에서 꺼내는 일은
 * 화면 쪽 책임이다.
 */

import { fromHex, toHex, type RGB } from "./color";

// 사진 변환을 쓰는 곳이 색 표기까지 함께 필요할 때가 많아 그대로 내보낸다
export { fromHex, toHex, type RGB };

/** 캔버스에서 꺼낸 픽셀. DOM을 모르는 형태로 받는다. */
export interface Pixels {
  width: number;
  height: number;
  /** RGBA가 이어 붙은 배열 — ImageData.data와 같은 형태 */
  data: Uint8ClampedArray;
}

/** 0~255로 자르고 정수로 만든다 */
const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));


/* --- 색 거리 -------------------------------------------------------------- */

/**
 * 두 색이 얼마나 달라 보이는지.
 *
 * 단순 RGB 거리는 사람 눈과 어긋난다(같은 거리라도 초록 쪽이 훨씬 크게 보인다).
 * 그렇다고 Lab까지 가면 코드가 배로 늘어나므로, 널리 쓰이는 가중 근사를 쓴다 —
 * 빨강 성분의 평균으로 채널 가중치를 조정하는 방식이다.
 */
export function colorDistance(a: RGB, b: RGB): number {
  const rMean = (a.r + b.r) / 2;
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(
    (((512 + rMean) * dr * dr) >> 8) +
      4 * dg * dg +
      (((767 - rMean) * db * db) >> 8)
  );
}

export function nearestColor(color: RGB, palette: RGB[]): number {
  if (palette.length === 0) throw new RangeError("팔레트가 비어 있습니다");
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < palette.length; i += 1) {
    const d = colorDistance(color, palette[i]);
    if (d < bestDistance) {
      bestDistance = d;
      best = i;
    }
  }
  return best;
}

/* --- 칸으로 줄이기 -------------------------------------------------------- */

/**
 * 사진을 칸 격자의 평균색으로 줄인다.
 *
 * 칸 하나에 해당하는 사진 영역의 평균을 낸다. 중앙 픽셀만 집으면 노이즈 하나가
 * 칸 전체 색을 결정해버린다.
 *
 * **y를 뒤집어 담는다.** 사진은 위에서 아래로 저장되고 차트는 아래가 첫 단이다
 * (domain/colorChart.ts). 뒤집지 않으면 옮긴 문양이 상하로 반전된다.
 */
export function downsampleToCells(
  pixels: Pixels,
  cols: number,
  rows: number
): RGB[] {
  if (cols <= 0 || rows <= 0)
    throw new RangeError("칸 수는 1 이상이어야 합니다");
  if (pixels.width <= 0 || pixels.height <= 0) {
    throw new RangeError("사진 크기가 올바르지 않습니다");
  }

  const cells: RGB[] = new Array(cols * rows);

  for (let row = 0; row < rows; row += 1) {
    // 사진의 위쪽이 차트의 마지막 단이 된다
    const srcTop = Math.floor((row * pixels.height) / rows);
    const srcBottom = Math.max(
      srcTop + 1,
      Math.floor(((row + 1) * pixels.height) / rows)
    );

    for (let col = 0; col < cols; col += 1) {
      const srcLeft = Math.floor((col * pixels.width) / cols);
      const srcRight = Math.max(
        srcLeft + 1,
        Math.floor(((col + 1) * pixels.width) / cols)
      );

      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;
      for (let y = srcTop; y < srcBottom; y += 1) {
        for (let x = srcLeft; x < srcRight; x += 1) {
          const i = (y * pixels.width + x) * 4;
          // 투명한 픽셀은 색이 없다. 섞으면 검정 쪽으로 끌린다.
          if (pixels.data[i + 3] < 8) continue;
          r += pixels.data[i];
          g += pixels.data[i + 1];
          b += pixels.data[i + 2];
          count += 1;
        }
      }

      const chartRow = rows - 1 - row;
      cells[chartRow * cols + col] =
        count === 0
          ? { r: 255, g: 255, b: 255 }
          : { r: r / count, g: g / count, b: b / count };
    }
  }

  return cells;
}

/* --- 팔레트 뽑기 ---------------------------------------------------------- */

const channelRange = (colors: RGB[], key: keyof RGB) => {
  let min = Infinity;
  let max = -Infinity;
  for (const c of colors) {
    if (c[key] < min) min = c[key];
    if (c[key] > max) max = c[key];
  }
  return max - min;
};

const average = (colors: RGB[]): RGB => {
  let r = 0;
  let g = 0;
  let b = 0;
  for (const c of colors) {
    r += c.r;
    g += c.g;
    b += c.b;
  }
  return { r: r / colors.length, g: g / colors.length, b: b / colors.length };
};

/**
 * 색을 count개로 줄인다 (median cut).
 *
 * k-means가 아니라 median cut을 쓴 이유는 **결정적**이기 때문이다. 무작위
 * 초기값이 없으므로 같은 사진에서 늘 같은 팔레트가 나오고, 테스트로 잠글 수
 * 있다. 사용자에게도 같은 사진을 다시 넣으면 같은 결과가 나오는 편이 낫다.
 *
 * 서로 다른 색이 count보다 적으면 있는 것만 돌려준다. 없는 색을 만들어
 * 채우면 팔레트에 쓰이지 않는 칸이 생긴다.
 */
export function extractPalette(colors: RGB[], count: number): RGB[] {
  if (colors.length === 0) throw new RangeError("색이 없습니다");
  if (count <= 0) throw new RangeError("팔레트 크기는 1 이상이어야 합니다");

  // 같은 색을 여러 번 세면 분할이 한쪽으로 쏠린다. 먼저 중복을 줄인다.
  const unique = new Map<string, RGB>();
  for (const c of colors) {
    unique.set(`${clamp(c.r)},${clamp(c.g)},${clamp(c.b)}`, {
      r: clamp(c.r),
      g: clamp(c.g),
      b: clamp(c.b),
    });
  }
  const distinct = [...unique.values()];
  if (distinct.length <= count) return distinct;

  let buckets: RGB[][] = [distinct];

  while (buckets.length < count) {
    // 가장 넓게 퍼진 통을 쪼갠다
    let target = -1;
    let targetKey: keyof RGB = "r";
    let widest = -1;
    buckets.forEach((bucket, i) => {
      if (bucket.length < 2) return;
      for (const key of ["r", "g", "b"] as const) {
        const range = channelRange(bucket, key);
        if (range > widest) {
          widest = range;
          target = i;
          targetKey = key;
        }
      }
    });
    // 더 쪼갤 수 없다 — 모든 통에 색이 하나씩만 남았다
    if (target === -1) break;

    const sorted = [...buckets[target]].sort(
      (a, b) => a[targetKey] - b[targetKey]
    );
    const mid = Math.floor(sorted.length / 2);
    buckets = [
      ...buckets.slice(0, target),
      sorted.slice(0, mid),
      sorted.slice(mid),
      ...buckets.slice(target + 1),
    ].filter((b) => b.length > 0);
  }

  return buckets.map(average);
}

/* --- 조립 ----------------------------------------------------------------- */

export interface ConvertResult {
  palette: string[];
  /** `y * cols + x`, y=0이 첫 단 */
  cells: number[];
}

/**
 * 사진을 차트 데이터로 옮긴다.
 *
 * `palette`를 주면 그 색으로만 맞춘다(스태시의 실 색). 주지 않으면 사진에서
 * `colorCount`개를 뽑는다.
 */
export function convertImage(
  pixels: Pixels,
  cols: number,
  rows: number,
  options: { palette?: string[]; colorCount?: number } = {}
): ConvertResult {
  const cellColors = downsampleToCells(pixels, cols, rows);

  const palette =
    options.palette && options.palette.length > 0
      ? options.palette.map(fromHex)
      : extractPalette(cellColors, options.colorCount ?? 4);

  return {
    palette: palette.map(toHex),
    cells: cellColors.map((color) => nearestColor(color, palette)),
  };
}
