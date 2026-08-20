import { useEffect, useRef, useState } from "react";
import {
  getCell,
  linePoints,
  rectPoints,
  type ColorChart,
  type FloatRun,
  type Point,
} from "@/domain/colorChart";
import { isLight } from "@/domain/color";

/** 두 점을 끌어 만드는 도형 */
export type ChartShape = "line" | "rect";

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
  /**
   * 한 획의 시작. 되돌리기가 이 시점의 상태를 기억한다.
   *
   * 칸마다 기록하면 드래그로 40칸을 칠한 뒤 되돌리기를 40번 눌러야 한다.
   * 한 획이 한 단위여야 손이 기억하는 단위와 맞는다.
   */
  onStrokeStart?: () => void;
  /**
   * 드래그로 이어 칠할지.
   *
   * 채우기·스포이드는 한 번만 동작해야 한다 — 끌면서 계속 채우면 의도한 영역을
   * 넘어 번지고, 스포이드는 마지막에 지나간 칸의 색이 잡힌다.
   */
  continuous?: boolean;
  /**
   * 좌표 번호와 칸 번호를 함께 그릴지.
   *
   * 도안은 "17단 3코"처럼 좌표로 말한다. 번호가 없으면 지금 어디를 칠하는지도,
   * 종이 도안과 대조도 할 수 없다. 코 번호는 **오른쪽이 1번**이고 단 번호는
   * **아래가 1단**이다 — 뜨는 순서가 그렇기 때문이고, 모든 도안이 그렇게 적는다.
   *
   * 칸 번호(몇 번 색인지)도 함께 넣는다. 색맹인 사람에게도, 흑백으로 인쇄한
   * 사람에게도 도안이 읽혀야 한다.
   */
  labels?: boolean;
  /**
   * 뒷실이 긴 구간. 사선 해칭으로 덮는다.
   *
   * 경고를 색으로 하지 않는 이유는 이게 틀린 게 아니기 때문이다 — 알고 하면
   * 되는 선택이다(docs/DESIGN.md §2). 게다가 팔레트가 사용자의 색이라 어떤
   * 경고색을 골라도 어느 도안에서는 배색과 구분되지 않는다. 해칭은 색과
   * 무관하게 읽힌다.
   */
  floats?: FloatRun[];
  /**
   * 무늬 반복 단위(코수·단수). 경계에 안내선을 얹는다.
   *
   * 10코마다 넣는 관습선과 별개다 — 그건 좌표를 세는 눈금이고, 이건 이 무늬가
   * 어디서 다시 시작하는지다. 무늬가 이어질 때 어긋나는 걸 그리는 중에 안다.
   */
  repeatStitches?: number;
  repeatRows?: number;
  /**
   * 두 점을 끌어 도형을 그리는 도구일 때의 모양.
   *
   * 이때는 칸마다 알리지 않는다. 끄는 동안 미리보기를 얹고, 손을 뗄 때
   * `onShape`로 한 번 알린다 — 지나간 칸이 아니라 두 끝이 뜻을 갖는 도구다.
   */
  shape?: ChartShape;
  /** 지금 칠하는 색(팔레트 인덱스). 도형 미리보기를 그 색으로 얹는다. */
  color?: number;
  onShape?: (from: Point, to: Point) => void;
}

/** 좌표 번호가 들어갈 여백(px) */
const GUTTER = 20;

/** 해칭 선 간격(px) */
const HATCH_STEP = 5;

/**
 * 캔버스가 놓인 자리에서 실제 색을 읽는다.
 *
 * 캔버스는 CSS 변수를 모르므로 계산된 값을 꺼내와야 한다. 하드코딩하면
 * 다크 모드에서 해칭이 배경에 묻힌다.
 */
function hatchColor(el: Element): string {
  return (
    getComputedStyle(el).getPropertyValue("--status-hibernating").trim() ||
    "#5a7691"
  );
}

/**
 * 어떤 색 위에서도 읽히는 선.
 *
 * 흰 선을 깔고 검은 선을 얹는다. 팔레트는 사용자의 색이라 한 겹으로 그으면
 * 어느 도안에서는 배색에 묻힌다 — 흰 실 위의 흰 선, 검은 실 위의 검은 선.
 */
function strokeTwoTone(ctx: CanvasRenderingContext2D, path: Path2D) {
  ctx.strokeStyle = "rgb(255 255 255 / 0.75)";
  ctx.lineWidth = 3;
  ctx.stroke(path);
  ctx.strokeStyle = "rgb(0 0 0 / 0.8)";
  ctx.lineWidth = 1;
  ctx.stroke(path);
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
  onStrokeStart,
  continuous = true,
  labels = false,
  floats,
  repeatStitches,
  repeatRows,
  shape,
  color,
  onShape,
}: ChartCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const painting = useRef(false);
  /** 도형을 끄는 중인 두 끝. 손을 뗄 때까지 차트는 건드리지 않는다. */
  const [drag, setDrag] = useState<{ from: Point; to: Point } | null>(null);
  /**
   * 커서가 있는 칸.
   *
   * 좌표를 알려주는 것이 목적이다 — 도안은 "17단 3코"로 말하는데, 번호만
   * 있으면 지금 손이 어느 좌표에 있는지는 여전히 세어야 한다.
   */
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);

  const gutter = labels ? GUTTER : 0;
  const gridWidth = Math.round(chart.width * cellWidth);
  const gridHeight = Math.round(chart.height * cellHeight);
  const width = gridWidth + gutter;
  const height = gridHeight + gutter;

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

    ctx.save();
    ctx.translate(gutter, gutter);

    const numbersFit = labels && cellWidth >= 15 && cellHeight >= 15;

    for (let y = 0; y < chart.height; y += 1) {
      for (let x = 0; x < chart.width; x += 1) {
        // 첫 단(y=0)이 맨 아래에 오도록 뒤집는다
        const screenY = (chart.height - 1 - y) * cellHeight;
        const index = getCell(chart, x, y);
        const hex = chart.palette[index] ?? "#000";
        ctx.fillStyle = hex;
        // 칸 사이에 반픽셀 틈이 생기지 않게 올림한다
        ctx.fillRect(
          x * cellWidth,
          screenY,
          Math.ceil(cellWidth),
          Math.ceil(cellHeight)
        );

        // 칸이 작으면 번호를 넣지 않는다. 읽히지 않는 글자는 격자만 흐린다.
        if (!numbersFit) continue;
        // 밝은 색 위에는 검정, 어두운 색 위에는 흰색 — 어떤 팔레트에서도 읽힌다
        ctx.fillStyle = isLight(hex)
          ? "rgb(0 0 0 / 0.55)"
          : "rgb(255 255 255 / 0.7)";
        ctx.font = `${Math.round(Math.min(cellWidth, cellHeight) * 0.5)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          String(index + 1),
          x * cellWidth + cellWidth / 2,
          screenY + cellHeight / 2
        );
      }
    }

    if (grid) {
      ctx.strokeStyle = "rgb(0 0 0 / 0.12)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= chart.width; x += 1) {
        const px = Math.round(x * cellWidth) + 0.5;
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, gridHeight);
        // 10코마다 진하게 — 도안의 관습이고, 좌표를 세지 않고도 위치를 잡는다
        ctx.strokeStyle =
          x % 10 === 0 ? "rgb(0 0 0 / 0.35)" : "rgb(0 0 0 / 0.12)";
        ctx.stroke();
      }
      for (let y = 0; y <= chart.height; y += 1) {
        const py = Math.round(y * cellHeight) + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(gridWidth, py);
        ctx.strokeStyle =
          (chart.height - y) % 10 === 0
            ? "rgb(0 0 0 / 0.35)"
            : "rgb(0 0 0 / 0.12)";
        ctx.stroke();
      }

      /*
        반복 경계.

        코는 **오른쪽부터** 세고 단은 **아래부터** 센다. 무늬는 1번 코에서
        시작하므로 왼쪽 끝에서 세면 폭이 반복의 배수가 아닐 때 경계가 전부
        어긋난다 — 안내선이 틀리면 없는 것보다 나쁘다.

        가장자리에는 긋지 않는다. 차트 테두리가 이미 거기 있다.
      */
      const repeat = new Path2D();
      let marked = false;
      if (repeatStitches && repeatStitches > 0) {
        for (let x = 1; x < chart.width; x += 1) {
          if ((chart.width - x) % repeatStitches !== 0) continue;
          const px = Math.round(x * cellWidth) + 0.5;
          repeat.moveTo(px, 0);
          repeat.lineTo(px, gridHeight);
          marked = true;
        }
      }
      if (repeatRows && repeatRows > 0) {
        for (let y = 1; y < chart.height; y += 1) {
          if (y % repeatRows !== 0) continue;
          const py = Math.round((chart.height - y) * cellHeight) + 0.5;
          repeat.moveTo(0, py);
          repeat.lineTo(gridWidth, py);
          marked = true;
        }
      }
      if (marked) strokeTwoTone(ctx, repeat);
    }

    if (floats && floats.length > 0) {
      ctx.strokeStyle = hatchColor(canvas);
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.85;
      for (const run of floats) {
        // 원형에서 합친 구간은 단의 끝에서 시작으로 넘어가므로 두 조각이다
        const head = Math.min(run.count, chart.width - run.x);
        const parts: [number, number][] = [[run.x, head]];
        if (run.count > head) parts.push([0, run.count - head]);
        const top = (chart.height - 1 - run.y) * cellHeight;

        for (const [startX, count] of parts) {
          const left = startX * cellWidth;
          const span = count * cellWidth;
          ctx.save();
          ctx.beginPath();
          ctx.rect(left, top, span, cellHeight);
          ctx.clip();
          ctx.beginPath();
          // 45도 사선. 왼쪽으로 한 칸 높이만큼 물러나 시작해야 왼쪽 끝이 빈다
          for (let px = left - cellHeight; px < left + span; px += HATCH_STEP) {
            ctx.moveTo(px, top + cellHeight);
            ctx.lineTo(px + cellHeight, top);
          }
          ctx.stroke();
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    if (!labels) return;

    // 좌표 번호. 코는 오른쪽이 1번, 단은 아래가 1단이다.
    const step = cellWidth >= 15 ? 1 : 5;
    ctx.fillStyle = "rgb(0 0 0 / 0.5)";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let x = 0; x < chart.width; x += 1) {
      const number = chart.width - x;
      if (number % step !== 0 && number !== 1) continue;
      ctx.fillText(
        String(number),
        gutter + x * cellWidth + cellWidth / 2,
        gutter / 2
      );
    }
    ctx.textAlign = "right";
    for (let y = 0; y < chart.height; y += 1) {
      const number = y + 1;
      if (number % step !== 0 && number !== 1) continue;
      const screenY = (chart.height - 1 - y) * cellHeight;
      ctx.fillText(
        String(number),
        gutter - 4,
        gutter + screenY + cellHeight / 2
      );
    }
  }, [
    chart,
    cellWidth,
    cellHeight,
    grid,
    labels,
    floats,
    repeatStitches,
    repeatRows,
    gutter,
    gridWidth,
    gridHeight,
    width,
    height,
  ]);

  /**
   * 커서 표시는 **별도 캔버스**에 그린다.
   *
   * 본 캔버스에 함께 그리면 포인터가 움직일 때마다 칸 전체를 다시 그려야 한다.
   * 120×200 도안이면 24,000칸이라 손이 끊긴다. 위에 얹은 얇은 캔버스에
   * 사각형 몇 개만 그리면 움직임이 붙는다.
   */
  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    /*
      도형 미리보기.

      실제로 칠할 칸 목록(도메인 함수)을 그대로 얹는다. 화면과 결과가 다른
      미리보기는 미리보기가 아니다 — 브레젠험 선을 눈대중으로 다시 그리면
      완만한 기울기에서 한 칸씩 어긋난다.
    */
    if (drag && shape) {
      const points =
        shape === "line"
          ? linePoints(drag.from, drag.to)
          : rectPoints(drag.from, drag.to);
      const hex = color !== undefined ? (chart.palette[color] ?? null) : null;
      ctx.save();
      ctx.translate(gutter, gutter);
      for (const point of points) {
        const px = point.x * cellWidth;
        const py = (chart.height - 1 - point.y) * cellHeight;
        if (hex) {
          ctx.globalAlpha = 0.75;
          ctx.fillStyle = hex;
          ctx.fillRect(px, py, Math.ceil(cellWidth), Math.ceil(cellHeight));
          ctx.globalAlpha = 1;
        }
        // 테두리를 함께 둘러야 칠할 색이 아래 칸과 같을 때도 어디가 잡혔는지 보인다
        ctx.strokeStyle = "rgb(0 0 0 / 0.45)";
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, cellWidth - 1, cellHeight - 1);
      }
      ctx.restore();
    }

    if (!hover || !labels) return;

    const screenY = (chart.height - 1 - hover.y) * cellHeight;

    // 좌표 번호 쪽을 강조한다. 격자 위에 색을 얹으면 칠한 색을 가린다.
    ctx.fillStyle = "rgb(0 0 0 / 0.1)";
    ctx.fillRect(gutter + hover.x * cellWidth, 0, cellWidth, gutter);
    ctx.fillRect(0, gutter + screenY, gutter, cellHeight);

    // 칸에는 테두리만 — 색을 가리지 않으면서 위치는 분명하다
    ctx.strokeStyle = "rgb(0 0 0 / 0.6)";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      gutter + hover.x * cellWidth + 1,
      gutter + screenY + 1,
      cellWidth - 2,
      cellHeight - 2
    );
  }, [
    hover,
    labels,
    drag,
    shape,
    color,
    chart.palette,
    chart.height,
    cellWidth,
    cellHeight,
    gutter,
    width,
    height,
  ]);

  /** 화면 좌표를 칸 좌표로. y는 뒤집어 되돌린다. */
  function toCell(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = ref.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    // 여백(좌표 번호) 안쪽만 격자다. 번호를 눌러도 칸이 칠해지면 안 된다.
    const scale = rect.width / width;
    const localX = (event.clientX - rect.left) / scale - gutter;
    const localY = (event.clientY - rect.top) / scale - gutter;
    if (localX < 0 || localY < 0) return null;
    const x = Math.floor(localX / cellWidth);
    const screenRow = Math.floor(localY / cellHeight);
    const y = chart.height - 1 - screenRow;
    if (x < 0 || y < 0 || x >= chart.width || y >= chart.height) return null;
    return { x, y };
  }

  const paint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!onPaint) return;
    const cell = toCell(event);
    if (cell) onPaint(cell.x, cell.y);
  };

  /** 도형 도구인가 — 이때는 칸마다 칠하지 않는다 */
  const shaping = Boolean(shape && onShape);

  return (
    /*
      두 캔버스를 겹친다. 커서 표시가 위 캔버스에만 그려지므로 포인터가 움직일
      때 본 캔버스를 다시 그리지 않는다. 위 캔버스는 포인터를 받지 않아야 한다 —
      받으면 칠하기가 통째로 막힌다.
    */
    <div className="relative" style={{ width, height }}>
      <canvas
        ref={ref}
        style={{ width, height }}
        className={
          onPaint || shaping ? "cursor-crosshair touch-none" : undefined
        }
        onPointerDown={(e) => {
          // 캔버스 밖으로 손가락이 나가도 이어서 잡게 붙잡아둔다.
          // 실패해도 계속한다 — 붙잡기는 편의이고, 이게 던져서 칠이 안 되면
          // 화면이 고장난 것처럼 보인다.
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // 이 포인터를 붙잡을 수 없는 환경. 캔버스 안에서는 그대로 동작한다.
          }
          if (shaping) {
            // 도형은 손을 뗄 때 한 번에 확정된다. 되돌리기 기억도 그때다 —
            // 여기서 쌓으면 끌다가 취소했을 때 아무것도 안 하는 되돌리기가 남는다.
            const cell = toCell(e);
            if (cell) setDrag({ from: cell, to: cell });
            return;
          }
          onStrokeStart?.();
          if (!onPaint) return;
          painting.current = true;
          paint(e);
        }}
        onPointerMove={(e) => {
          if (labels) setHover(toCell(e));
          if (shaping) {
            if (!drag) return;
            const cell = toCell(e);
            // 격자 밖으로 나가면 마지막 칸을 유지한다. 끝점이 사라지면
            // 미리보기가 깜빡이고, 손을 뗀 자리와 결과가 달라진다.
            if (cell) setDrag((d) => (d ? { ...d, to: cell } : d));
            return;
          }
          if (continuous && painting.current) paint(e);
        }}
        onPointerLeave={() => setHover(null)}
        onPointerUp={() => {
          painting.current = false;
          if (drag) {
            onShape?.(drag.from, drag.to);
            setDrag(null);
          }
        }}
        onPointerCancel={() => {
          painting.current = false;
          // 취소는 확정이 아니다 — 차트를 건드리지 않고 미리보기만 지운다
          setDrag(null);
        }}
      />
      <canvas
        ref={overlayRef}
        aria-hidden
        style={{ width, height }}
        className="pointer-events-none absolute inset-0"
      />
    </div>
  );
}
