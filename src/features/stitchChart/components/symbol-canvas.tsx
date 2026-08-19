import { useEffect, useRef } from "react";
import type { StitchChart } from "@/domain/stitchChart";
import { drawSymbol, resolveInk } from "@/features/stitchChart/symbols";
import { paintStitchChart } from "@/features/stitchChart/paint";
import { useIsDark } from "@/app/theme";

export interface SymbolCanvasProps {
  chart: StitchChart;
  cellWidth: number;
  /**
   * 칸 하나의 화면 높이(px).
   *
   * 편집 격자는 정사각형으로 두고, 미리보기는 게이지 비율을 넣는다. 색상
   * 차트와 같은 구조다 — 뜨개 코는 정사각형이 아니다.
   */
  cellHeight: number;
  grid?: boolean;
  /** 지금 읽고 있는 단(저장 좌표, 0 = 첫 단). 배경을 옅게 칠해 표시한다. */
  highlightRow?: number;
  /** 코수가 맞지 않는 단(저장 좌표). 왼쪽에 붉은 표를 세운다. */
  badRows?: readonly number[];
  onPaint?: (x: number, y: number) => void;
}

/**
 * 심볼 차트를 캔버스에 그린다.
 *
 * 색상 차트와 같은 이유로 캔버스다 — 칸마다 DOM을 두면 드래그가 끊긴다.
 * 다른 점은 색이 아니라 선을 그린다는 것이고, 그래서 잉크 색을 테마에서
 * 읽어와야 한다.
 *
 * **y를 뒤집어 그린다.** 저장은 y=0이 첫 단(아래)이고 화면은 위에서 아래로
 * 그린다.
 */
export function SymbolCanvas({
  chart,
  cellWidth,
  cellHeight,
  grid = true,
  highlightRow,
  badRows,
  onPaint,
}: SymbolCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const painting = useRef(false);
  // 테마가 바뀌면 잉크 색을 다시 읽어야 한다
  const dark = useIsDark();

  const width = Math.round(chart.width * cellWidth);
  const height = Math.round(chart.height * cellHeight);
  const badKey = badRows?.join(",") ?? "";

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    paintStitchChart(canvas, {
      chart,
      cellWidth,
      cellHeight,
      grid,
      highlightRow,
      badRows,
      colors: resolveInk(canvas),
    });
  }, [
    chart,
    cellWidth,
    cellHeight,
    grid,
    width,
    height,
    highlightRow,
    badRows,
    badKey,
    dark,
  ]);

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
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // 붙잡을 수 없는 환경. 캔버스 안에서는 그대로 동작한다.
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

/** 범례·기법 선택에 쓰는 한 칸짜리 심볼. 격자와 같은 그림을 쓴다. */
export function SymbolSwatch({ op, size = 24 }: { op: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dark = useIsDark();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    drawSymbol(ctx, op, 0, 0, size, size, resolveInk(canvas));
  }, [op, size, dark]);

  return <canvas ref={ref} style={{ width: size, height: size }} aria-hidden />;
}
