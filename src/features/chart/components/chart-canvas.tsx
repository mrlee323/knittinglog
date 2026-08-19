import { useEffect, useRef } from "react";
import { getCell, type ColorChart } from "@/domain/colorChart";

export interface ChartCanvasProps {
  chart: ColorChart;
  /** 칸 하나의 화면 너비(px) */
  cellWidth: number;
  /**
   * 칸 하나의 화면 높이(px).
   *
   * 편집 격자는 정사각형으로 두고(cellWidth와 같게), 미리보기는 게이지 비율을
   * 넣는다. 같은 데이터를 두 방식으로 그리는 것이 이 기능의 핵심이다.
   */
  cellHeight: number;
  /** 칸 경계선을 그릴지. 미리보기에서는 끈다 — 완성품에는 선이 없다. */
  grid?: boolean;
  onPaint?: (x: number, y: number) => void;
}

/**
 * 차트를 캔버스에 그린다.
 *
 * DOM 요소를 칸마다 두지 않는다. 40×40이면 1600개인데, 드래그로 칠할 때마다
 * 그만큼의 노드가 다시 그려지면 손이 미끄러진 것처럼 끊긴다.
 *
 * **y를 뒤집어 그린다.** 저장은 y=0이 첫 단(아래)이고 화면은 위에서 아래로
 * 그리므로, 뒤집지 않으면 도안이 상하로 반전된다(domain/colorChart.ts).
 */
export function ChartCanvas({
  chart,
  cellWidth,
  cellHeight,
  grid = true,
  onPaint,
}: ChartCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const painting = useRef(false);

  const width = Math.round(chart.width * cellWidth);
  const height = Math.round(chart.height * cellHeight);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 고해상도 화면에서 칸 경계가 번지지 않게 배율을 곱한다
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    for (let y = 0; y < chart.height; y += 1) {
      for (let x = 0; x < chart.width; x += 1) {
        // 첫 단(y=0)이 맨 아래에 오도록 뒤집는다
        const screenY = (chart.height - 1 - y) * cellHeight;
        ctx.fillStyle = chart.palette[getCell(chart, x, y)] ?? "#000";
        // 칸 사이에 반픽셀 틈이 생기지 않게 올림한다
        ctx.fillRect(
          x * cellWidth,
          screenY,
          Math.ceil(cellWidth),
          Math.ceil(cellHeight)
        );
      }
    }

    if (!grid) return;
    ctx.strokeStyle = "rgb(0 0 0 / 0.12)";
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
  }, [chart, cellWidth, cellHeight, grid, width, height]);

  /** 화면 좌표를 칸 좌표로. y는 뒤집어 되돌린다. */
  function toCell(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = ref.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const x = Math.floor(
      ((event.clientX - rect.left) / rect.width) * chart.width
    );
    const screenRow = Math.floor(
      ((event.clientY - rect.top) / rect.height) * chart.height
    );
    const y = chart.height - 1 - screenRow;
    if (x < 0 || y < 0 || x >= chart.width || y >= chart.height) return null;
    return { x, y };
  }

  const paint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!onPaint) return;
    const cell = toCell(event);
    if (cell) onPaint(cell.x, cell.y);
  };

  return (
    <canvas
      ref={ref}
      style={{ width, height }}
      className={onPaint ? "cursor-crosshair touch-none" : undefined}
      onPointerDown={(e) => {
        if (!onPaint) return;
        painting.current = true;
        // 캔버스 밖으로 손가락이 나가도 이어서 칠하게 잡아둔다.
        // 실패해도 칠하기는 계속한다 — 붙잡기는 편의이고, 이게 던져서
        // 칠이 안 되면 화면이 고장난 것처럼 보인다.
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // 이 포인터를 붙잡을 수 없는 환경. 캔버스 안에서는 그대로 동작한다.
        }
        paint(e);
      }}
      onPointerMove={(e) => {
        if (painting.current) paint(e);
      }}
      onPointerUp={() => {
        painting.current = false;
      }}
      onPointerCancel={() => {
        painting.current = false;
      }}
    />
  );
}
