import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * 두 칸으로 나눠 보여주고, 경계를 끌어 비율을 바꾼다.
 *
 * 작업대(도안 + 영상)와 뜨기 모드(도안 + 카운터)가 같은 컴포넌트를 쓴다.
 * **고정 반반은 늘 둘 중 하나가 아쉽다** — 차트 도안은 넓어야 하고, 서술형
 * 도안은 좁아도 읽힌다. 뜨기 모드에서는 도안을 크게 보다가 무늬가 외워지면
 * 카운터 쪽을 늘리게 된다.
 */
export function SplitPane({
  direction,
  first,
  second,
  initialRatio = 50,
  min = 20,
  max = 80,
  label,
  className,
}: {
  direction: "row" | "column";
  first: ReactNode;
  /** 없으면 첫 칸이 전체를 쓴다 */
  second?: ReactNode;
  initialRatio?: number;
  min?: number;
  max?: number;
  label: string;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [ratio, setRatio] = useState(initialRatio);
  const clamp = (value: number) => Math.min(max, Math.max(min, value));
  const row = direction === "row";

  if (second === undefined) {
    return (
      <div className={cn("grid min-h-0 min-w-0", className)}>{first}</div>
    );
  }

  /**
   * 드래그 여부를 ref로 들고 있는다.
   *
   * setPointerCapture는 포인터가 iframe이나 캔버스 위를 지나도 이벤트가 끊기지
   * 않게 해주지만, 그것만 믿으면 캡처가 실패한 환경에서 경계가 조용히 움직이지
   * 않는다.
   */
  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const box = container.current?.getBoundingClientRect();
    if (!box) return;
    setRatio(
      clamp(
        row
          ? ((event.clientX - box.left) / box.width) * 100
          : ((event.clientY - box.top) / box.height) * 100
      )
    );
  };
  const endDrag = () => {
    dragging.current = false;
  };

  return (
    <div
      ref={container}
      className={cn("grid min-h-0 min-w-0", className)}
      style={
        // minmax(0, …)를 쓴다. 기본 fr은 내용보다 작아지지 않아서 넘치는 대신
        // 격자가 커지고, 그러면 아래 칸이 화면 밖으로 나간다.
        row
          ? {
              gridTemplateColumns: `minmax(0, ${ratio}fr) 12px minmax(0, ${100 - ratio}fr)`,
            }
          : {
              gridTemplateRows: `minmax(0, ${ratio}fr) 12px minmax(0, ${100 - ratio}fr)`,
            }
      }
    >
      {/* 칸을 grid로 둔다. 그냥 div면 자식이 이 칸의 높이를 물려받지 못해서
          안에서 쓴 flex-1이 아무 일도 하지 않고 내용만큼 늘어난다 — 낮은 창에서
          카운터의 조작 버튼이 화면 밖으로 밀려나는 원인이었다. */}
      <div className="grid min-h-0 min-w-0 overflow-hidden">{first}</div>

      {/* 키보드로도 옮길 수 있어야 한다 — 마우스를 놓고 키보드만 쓰는 순간이 있다 */}
      <div
        role="separator"
        aria-orientation={row ? "vertical" : "horizontal"}
        aria-valuenow={Math.round(ratio)}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-label={label}
        tabIndex={0}
        onPointerDown={startDrag}
        onPointerMove={onDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onKeyDown={(e) => {
          const back = row ? "ArrowLeft" : "ArrowUp";
          const forward = row ? "ArrowRight" : "ArrowDown";
          if (e.key === back) setRatio((r) => clamp(r - 5));
          if (e.key === forward) setRatio((r) => clamp(r + 5));
        }}
        className={cn(
          "group flex touch-none items-center justify-center",
          row ? "cursor-col-resize" : "cursor-row-resize"
        )}
      >
        <span
          className={cn(
            "bg-line group-hover:bg-line-strong rounded-full transition",
            row ? "h-16 w-[3px]" : "h-[3px] w-16"
          )}
        />
      </div>

      <div className="grid min-h-0 min-w-0 overflow-hidden">{second}</div>
    </div>
  );
}
