/**
 * 천 미리보기 계산.
 *
 * 배색 도안을 사각형 칸으로 보여주면 "무늬 한 번"만 보인다. 그런데 페어아일에서
 * 실제로 궁금한 것은 **반복해서 깔았을 때 어떻게 보이는가**다 — 한 번은 예뻐도
 * 여러 번 이으면 줄무늬처럼 보이거나, 반복 경계가 눈에 띄는 무늬가 있다.
 * 옷을 다 뜬 뒤에 알게 되는 종류의 문제다.
 *
 * 여기는 **몇 번 깔지**와 **어떤 톤으로 칠할지**를 정한다. 코 모양을 그리는 일은
 * 화면 계층이 한다.
 */

import { isLight, shade, tint } from "./color";

export interface RepeatPlan {
  x: number;
  y: number;
  /** 실제로 그릴 칸 수 — 성능 상한에 걸렸는지 판단하는 데 쓴다 */
  cells: number;
  /** 상한 때문에 원하는 만큼 못 깔았는지 */
  capped: boolean;
}

/**
 * 자리를 채우는 데 필요한 반복 횟수.
 *
 * **최소 2번은 깐다.** 한 번만 보이면 반복 미리보기가 아니고, 무늬 경계가 어떻게
 * 이어지는지는 두 번째가 붙어야 드러난다.
 *
 * 칸 수에 상한을 둔다. 4코 무늬를 큰 화면에 깔면 수만 칸이 되고, 색칠하는 동안
 * 매번 다시 그리므로 손이 끊긴다. 상한에 걸리면 반복을 줄이되 **가로를 먼저
 * 지킨다** — 무늬가 옆으로 이어지는 모습이 세로보다 먼저 궁금하다.
 */
export function planRepeats(input: {
  chartWidth: number;
  chartHeight: number;
  cellWidth: number;
  cellHeight: number;
  availableWidth: number;
  availableHeight: number;
  maxCells?: number;
}): RepeatPlan {
  const {
    chartWidth,
    chartHeight,
    cellWidth,
    cellHeight,
    availableWidth,
    availableHeight,
    maxCells = 12_000,
  } = input;

  const unitWidth = Math.max(1, chartWidth) * Math.max(0.1, cellWidth);
  const unitHeight = Math.max(1, chartHeight) * Math.max(0.1, cellHeight);

  const fitX = Math.max(2, Math.ceil(availableWidth / unitWidth));
  const fitY = Math.max(2, Math.ceil(availableHeight / unitHeight));

  const perRepeat = Math.max(1, chartWidth) * Math.max(1, chartHeight);
  let x = fitX;
  let y = fitY;

  // 세로부터 줄인다. 가로로 이어지는 모습을 먼저 보여주는 게 낫다.
  while (x * y * perRepeat > maxCells && y > 1) y -= 1;
  while (x * y * perRepeat > maxCells && x > 1) x -= 1;

  return {
    x,
    y,
    cells: x * y * perRepeat,
    capped: x < fitX || y < fitY,
  };
}

/**
 * 코 하나를 그릴 때 쓰는 세 가지 색.
 *
 * 실 색 하나를 그대로 칠하면 격자가 아니라 색 덩어리가 된다. 코의 결이 보여야
 * 천처럼 읽히는데, 그러려면 같은 색의 밝은 톤과 어두운 톤이 필요하다.
 *
 * **밝은 실은 눌러서 결을 만든다.** 흰 실에 흰 하이라이트를 얹으면 아무것도
 * 보이지 않으므로, 밝은 색은 어둡게 눌러 결을 드러낸다.
 */
export interface StitchShades {
  /** 칸 바탕 */
  base: string;
  /** 실 가닥 */
  strand: string;
  /** 코 사이 그늘 */
  gap: string;
}

export function stitchShades(hex: string): StitchShades {
  return isLight(hex)
    ? { base: hex, strand: shade(hex, 0.1), gap: shade(hex, 0.26) }
    : { base: hex, strand: tint(hex, 0.16), gap: shade(hex, 0.3) };
}
