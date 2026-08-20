import { useEffect, useRef, useState } from "react";
import { paintFabric } from "@/features/chart/fabric";
import type { ColorChart } from "@/domain/colorChart";

/**
 * 천처럼 그린 배색 미리보기.
 *
 * 자리 폭을 재서 그 폭만큼 무늬를 깐다. 폭을 관찰 콜백에만 맡기지 않고 붙는 즉시
 * 한 번 재는 이유는 PDF 뷰어와 같다 — 콜백이 미뤄지는 환경에서 폭이 0으로 남아
 * 미리보기가 계속 빈 화면이 된다.
 */
export function FabricCanvas({
  chart,
  cellWidth,
  cellHeight,
  height,
  onRepeats,
}: {
  chart: ColorChart;
  cellWidth: number;
  cellHeight: number;
  height: number;
  onRepeats?: (repeats: { x: number; y: number }) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const timer = setTimeout(() => setWidth(el.clientWidth), 0);
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0) return;
    const result = paintFabric(canvas, {
      chart,
      cellWidth,
      cellHeight,
      width,
      height,
    });
    onRepeats?.(result.repeats);
  }, [chart, cellWidth, cellHeight, width, height, onRepeats]);

  return (
    <div ref={wrapRef} className="w-full overflow-hidden" style={{ height }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height }}
        className="block"
      />
    </div>
  );
}
