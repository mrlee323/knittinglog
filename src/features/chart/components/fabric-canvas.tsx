import { useEffect, useRef, useState } from "react";
import { paintFabric } from "@/features/chart/fabric";
import { stitchSprite } from "@/features/chart/stitch-sprite";
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
  /**
   * 명암 스프라이트 준비 여부.
   *
   * 디코딩은 비동기다. 준비되기 전 프레임은 실 색만 칠하고, 준비되면 이 값이
   * 바뀌어 한 번 더 그린다 — 빈 화면을 보여주지 않고 색이 먼저 나오는 편이 낫다.
   */
  const [spriteReady, setSpriteReady] = useState(
    () => stitchSprite().image !== null
  );

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
    // spriteReady를 의존성에 넣어, 스프라이트가 늦게 도착하면 한 번 더 그린다
  }, [chart, cellWidth, cellHeight, width, height, onRepeats, spriteReady]);

  // 스프라이트 준비를 기다린다. 이미 준비됐으면 아무 일도 하지 않는다.
  useEffect(() => {
    if (spriteReady) return;
    let alive = true;
    void stitchSprite()
      .ready.then(() => {
        if (alive) setSpriteReady(true);
      })
      .catch(() => {
        // 스프라이트가 없어도 색만으로 그려진다 — 화면이 비지는 않는다
      });
    return () => {
      alive = false;
    };
  }, [spriteReady]);

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
