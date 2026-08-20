import { getCell, type ColorChart } from "@/domain/colorChart";
import { planRepeats, stitchShades } from "@/domain/fabric";

/**
 * 배색 도안을 천처럼 그린다.
 *
 * 사각형 칸으로 보여주면 색 덩어리이고, 무늬 한 번만 보인다. 실제로 궁금한 것은
 * **반복해서 깔았을 때 어떻게 보이는가**다 — 한 번은 예뻐도 여러 번 이으면
 * 줄무늬처럼 보이거나 반복 경계가 눈에 띄는 무늬가 있고, 그건 옷을 다 뜬 뒤에
 * 알게 된다.
 *
 * **코마다 스탬프를 미리 만들어 찍는다.** 칸마다 곡선을 새로 그리면 수천 번의
 * path가 되고, 색칠하는 동안 매 획마다 다시 그리므로 손이 끊긴다. 팔레트는
 * 보통 두세 색이므로 색당 하나만 만들면 그 뒤는 drawImage 뿐이다.
 */

export interface FabricOptions {
  chart: ColorChart;
  /** 칸 하나의 크기(CSS px). 게이지 비율이 들어간 값을 받는다. */
  cellWidth: number;
  cellHeight: number;
  /** 그릴 자리 크기(CSS px) */
  width: number;
  height: number;
}

export interface FabricResult {
  repeats: { x: number; y: number };
  capped: boolean;
}

export function paintFabric(
  canvas: HTMLCanvasElement,
  { chart, cellWidth, cellHeight, width, height }: FabricOptions
): FabricResult {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { repeats: { x: 1, y: 1 }, capped: false };

  const plan = planRepeats({
    chartWidth: chart.width,
    chartHeight: chart.height,
    cellWidth,
    cellHeight,
    availableWidth: width,
    availableHeight: height,
  });

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  // 코를 칸보다 높게 그려 아래 단의 머리를 덮는다. 실제 메리야스가 그렇게
  // 물려 있고, 그래야 옆 코와의 경계가 단마다 끊겨 보인다 — 딱 칸에 맞춰
  // 그리면 밝은 실 가닥이 세로로 이어져 자로 그은 선처럼 보였다.
  const stampHeight = cellHeight * OVERLAP;
  const stamps = chart.palette.map((hex) =>
    stitchStamp(hex, cellWidth, stampHeight, dpr)
  );

  const rows = chart.height * plan.y;
  const cols = chart.width * plan.x;

  // 아래 단부터 그린다. 뜨개는 위 단의 코가 아래 단의 머리를 덮으므로,
  // 그 순서로 겹쳐야 실이 물려 있는 것처럼 보인다.
  for (let row = 0; row < rows; row += 1) {
    const y = height - (row + 1) * cellHeight;
    if (y > height || y + cellHeight < 0) continue;
    for (let col = 0; col < cols; col += 1) {
      const stamp = stamps[getCell(chart, col % chart.width, row % chart.height)];
      if (!stamp) continue;
      // 아래 단부터 그리므로, 위 단의 넘친 부분이 아래 단의 머리를 덮는다
      ctx.drawImage(stamp, col * cellWidth, y, cellWidth, stampHeight);
    }
  }

  return { repeats: { x: plan.x, y: plan.y }, capped: plan.capped };
}

/**
 * 코 하나를 그려둔 작은 캔버스.
 *
 * 메리야스 겉면의 한 코는 아래가 모이고 위가 벌어진 V자다. 두 가닥을 굵은 선으로
 * 그리고 칸 경계에 그늘을 두면 격자가 천으로 읽힌다.
 *
 * 세로로 조금 넘겨 그린다. 딱 칸에 맞추면 코 사이에 실선 같은 틈이 보이는데,
 * 실제 천에는 그런 틈이 없다.
 */
/**
 * 코를 칸 높이의 몇 배로 그릴지.
 *
 * 1보다 커야 위 단이 아래 단을 덮는다. 너무 크면 무늬가 위로 밀려 보이므로
 * 한 단의 3분의 1 정도만 겹친다.
 */
const OVERLAP = 1.34;

const cache = new Map<string, HTMLCanvasElement>();

function stitchStamp(
  hex: string,
  cellWidth: number,
  cellHeight: number,
  dpr: number
): HTMLCanvasElement {
  const key = `${hex}|${cellWidth.toFixed(2)}|${cellHeight.toFixed(2)}|${dpr}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const shades = stitchShades(hex);
  const canvas = document.createElement("canvas");
  const w = Math.max(2, Math.ceil(cellWidth * dpr));
  const h = Math.max(2, Math.ceil(cellHeight * dpr));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // 바탕 — 칸 사이에 틈이 생기지 않게 꽉 채운다
  ctx.fillStyle = shades.base;
  ctx.fillRect(0, 0, w, h);

  // 넘친 아래쪽은 그늘로 둔다. 위 단이 아래 단에 드리우는 그림자이고, 이것이
  // 단 경계를 만든다.
  const skirt = h * (1 - 1 / OVERLAP);
  ctx.fillStyle = shades.gap;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(0, h - skirt, w, skirt);
  ctx.globalAlpha = 1;

  // V자 두 가닥
  ctx.strokeStyle = shades.strand;
  ctx.lineWidth = Math.max(1, w * 0.3);
  ctx.lineCap = "round";
  const cx = w / 2;

  // 팔을 칸 밖까지 뻗는다. 가장자리 안쪽에서 끊으면 옆 코와의 사이에 바탕색
  // 띠가 남아 **세로 이음선이 규칙적으로 보인다** — 실제 메리야스는 옆 코와
  // 맞물려 있어서 그런 틈이 없다. 넘친 부분은 스탬프 경계에서 잘린다.
  // V자는 칸 안쪽(넘친 부분 위)에 그린다. 팔 끝을 위까지 붙이지 않고 조금
  // 남겨 두면 옆 코와의 경계가 단마다 끊긴다.
  const foot = h - skirt;
  ctx.beginPath();
  ctx.moveTo(cx, foot * 0.98);
  ctx.quadraticCurveTo(cx - w * 0.4, foot * 0.55, cx - w * 0.5, foot * 0.12);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx, foot * 0.98);
  ctx.quadraticCurveTo(cx + w * 0.4, foot * 0.55, cx + w * 0.5, foot * 0.12);
  ctx.stroke();

  cache.set(key, canvas);
  // 팔레트를 이리저리 바꾸면 스탬프가 쌓인다. 오래된 것부터 버린다.
  if (cache.size > 48) cache.delete(cache.keys().next().value!);
  return canvas;
}
