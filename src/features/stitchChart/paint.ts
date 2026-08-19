import { getOp, type StitchChart } from "@/domain/stitchChart";
import { drawSymbol, type SymbolInk } from "@/features/stitchChart/symbols";

export interface PaintOptions {
  chart: StitchChart;
  cellWidth: number;
  cellHeight: number;
  grid?: boolean;
  highlightRow?: number;
  badRows?: readonly number[];
  colors: SymbolInk;
}

/**
 * 격자를 캔버스에 그린다.
 *
 * 화면 컴포넌트와 공유 카드가 같은 함수를 쓴다 — 카드가 화면과 다른 그림을
 * 내보내면 공유한 뒤에야 그걸 알게 된다.
 *
 * **y를 뒤집어 그린다.** 저장은 y=0이 첫 단(아래)이고 화면은 위에서 아래로
 * 그린다.
 */
export function paintStitchChart(
  canvas: HTMLCanvasElement,
  {
    chart,
    cellWidth,
    cellHeight,
    grid = true,
    highlightRow,
    badRows,
    colors,
  }: PaintOptions
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = Math.round(chart.width * cellWidth);
  const height = Math.round(chart.height * cellHeight);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const screenY = (y: number) => (chart.height - 1 - y) * cellHeight;

  // 읽는 중인 단을 먼저 칠한다 — 심볼이 그 위에 오게
  if (highlightRow !== undefined) {
    ctx.fillStyle = colors.muted;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(0, screenY(highlightRow), width, Math.ceil(cellHeight));
    ctx.globalAlpha = 1;
  }

  if (grid) {
    ctx.strokeStyle = colors.muted;
    ctx.lineWidth = 1;
    for (let x = 0; x <= chart.width; x += 1) {
      const px = Math.round(x * cellWidth) + 0.5;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height);
      ctx.stroke();
    }
    for (let y = 0; y <= chart.height; y += 1) {
      const py = Math.round(y * cellHeight) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(width, py);
      ctx.stroke();
    }
  }

  for (let y = 0; y < chart.height; y += 1)
    for (let x = 0; x < chart.width; x += 1)
      drawSymbol(
        ctx,
        getOp(chart, x, y),
        x * cellWidth,
        screenY(y),
        cellWidth,
        cellHeight,
        colors
      );

  // 코수가 맞지 않는 단 표시. 검산 결과를 목록에서만 보여주면 격자의 어디가
  // 문제인지 눈으로 찾아야 하는데, 40단쯤 되면 그게 안 된다.
  if (badRows?.length) {
    ctx.fillStyle = "#c0563f";
    for (const y of badRows) {
      if (y < 0 || y >= chart.height) continue;
      ctx.fillRect(0, screenY(y), 3, Math.ceil(cellHeight));
    }
  }
}
