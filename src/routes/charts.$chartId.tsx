import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { hasStitches } from "@/domain/piece";
import { listPieces } from "@/features/piece/repository";
import {
  Brush,
  ChevronLeft,
  Contrast,
  FlipHorizontal,
  FlipHorizontal2,
  ImagePlus,
  Minus,
  PaintBucket,
  Pipette,
  Plus,
  Redo2,
  Replace,
  Slash,
  Square,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import { BackLink, Page } from "@/components/ui/page";
import { ChartCanvas } from "@/features/chart/components/chart-canvas";
import { FabricCanvas } from "@/features/chart/components/fabric-canvas";
import { PhotoToChart } from "@/features/chart/components/photo-to-chart";
import {
  getChart,
  renameChart,
  saveChart,
  setChartFloats,
  setChartGauge,
  setChartRepeat,
  toChart,
} from "@/features/chart/repository";
import { listGauges } from "@/features/gauge/repository";
import {
  cellAspect,
  chartSizeCm,
  contrastWarnings,
  DEFAULT_FLOAT_LIMIT,
  fillArea,
  getCell,
  insertColumn,
  insertRow,
  linePoints,
  longFloats,
  mirrorCell,
  mirrorChart,
  paintPoints,
  rectPoints,
  remapColor,
  removeColumn,
  removeRow,
  resizeChart,
  rowRuns,
  setCell,
  stitchCounts,
  type ColorChart,
  type Point,
} from "@/domain/colorChart";
import { toGray } from "@/domain/color";
import { fitRepeat } from "@/domain/construction";
import { useUnits } from "@/app/units";
import { useWideEnough } from "@/lib/use-media-query";
import { useStrings } from "@/i18n";
import { cn } from "@/lib/utils";
import type { ProjectPiece } from "@/types/entities";
import type { ColorChartRecord, GaugeRecord } from "@/types/entities";

export const Route = createFileRoute("/charts/$chartId")({
  component: ChartEditor,
});

/**
 * 그리기 도구.
 *
 * 다섯으로 끝낸다. 자유 브러시 크기·회전은 넣지 않는다 — 코는 이산적이고,
 * 90도 돌리면 코와 단이 바뀌어 게이지 비율이 뒤집힌다(docs/CHART-EDITOR.md §7).
 *
 * 직선·사각형은 손을 뗄 때 확정되는 도구다. 지나간 칸이 아니라 **두 끝**이
 * 뜻을 가지므로 끄는 동안 미리보기만 얹는다.
 */
type Tool = "paint" | "fill" | "pick" | "line" | "rect";

const TOOLS = [
  { id: "paint" as const, icon: Brush },
  { id: "fill" as const, icon: PaintBucket },
  { id: "pick" as const, icon: Pipette },
  { id: "line" as const, icon: Slash },
  { id: "rect" as const, icon: Square },
];

/** 위치를 입력받는 칸에서 쓰는 숫자 읽기. 빈 칸과 오타는 없는 값이다. */
const num = (raw: string) => {
  const parsed = Number(raw);
  return raw.trim() === "" || Number.isNaN(parsed)
    ? undefined
    : Math.floor(parsed);
};

/** 되돌리기 스택 상한. 차트가 작아서 이 정도는 20KB를 넘지 않는다. */
const HISTORY_LIMIT = 50;

/**
 * 뒷실 기준으로 고를 수 있는 값(코).
 *
 * 실 굵기와 취향에 따라 다르다 — 굵은 실은 더 짧게 잡는다. 자유 입력으로 두지
 * 않는 것은 이게 취향의 범위가 좁은 값이기 때문이다.
 */
const FLOAT_LIMITS = [3, 4, 5, 6, 7, 8, 9] as const;

/** 편집 격자의 칸 크기. 손가락으로 칠할 수 있는 최소치에서 출발한다. */
const EDIT_CELL = 18;
/**
 * 미리보기 줌 단계 — 칸 하나의 기준 너비(px). 비율은 게이지가 정한다.
 *
 * 미리보기의 크기 기준은 완성 치수(cm)가 아니라 **줌과 반복 횟수**다. 무늬를
 * 크게 보고 싶은 것과 실제로 몇 cm가 되는지는 다른 질문이고, 여기서 궁금한 건
 * 앞쪽이다 — 반복 경계가 어떻게 이어지는지, 색이 섞여 보이는지.
 */
const PREVIEW_ZOOMS = [6, 10, 16] as const;
/** 천 미리보기 높이(px). 무늬가 여러 번 이어지는 게 보일 만큼은 필요하다. */
const FABRIC_HEIGHT = 260;
/** 좁은 화면에서는 위에 붙여두므로 낮게 — 격자를 가리면 칠할 수 없다. */
const FABRIC_HEIGHT_NARROW = 132;
/** 칸을 칠한 뒤 저장까지 기다리는 시간(ms) */
const SAVE_DELAY = 400;

/**
 * 레코드를 읽어 편집기에 넘긴다.
 *
 * 편집기를 record.id로 키를 걸어 마운트할 때만 상태를 씨딩한다. DB가 바뀔
 * 때마다 로컬 상태를 덮어쓰면, 저장이 늦게 도착할 때 방금 칠한 칸이
 * 되돌아간다. 반대로 게이지 선택 같은 값은 props로 계속 흘러들어온다.
 */
function ChartEditor() {
  const { chartId } = Route.useParams();
  const record = useLiveQuery(() => getChart(chartId), [chartId]);
  const gauges = useLiveQuery(() => listGauges(), []);
  // 프로젝트에서 연 도안이면 조각의 코수를 얹을 코수로 끌어올 수 있다.
  // 예전에는 이 숫자를 사용자가 외워서 옮겨 적었다.
  const pieces = useLiveQuery(
    () => (record?.projectId ? listPieces(record.projectId) : []),
    [record?.projectId]
  );

  if (!record) return null;
  return (
    <Editor
      key={record.id}
      record={record}
      gauges={gauges ?? []}
      pieces={pieces ?? []}
    />
  );
}

function Editor({
  record,
  gauges,
  pieces,
}: {
  record: ColorChartRecord;
  gauges: GaugeRecord[];
  pieces: ProjectPiece[];
}) {
  const t = useStrings();
  const units = useUnits();
  const navigate = useNavigate();
  const chartId = record.id;

  /**
   * 편집 중인 차트는 로컬 상태다.
   *
   * 칸을 칠할 때마다 DB를 왕복하면 드래그가 끊긴다. 저장은 잦아든 뒤에 한 번
   * 한다. 그래서 화면의 진실은 이 상태이고 DB는 사본이다.
   */
  const [chart, setChart] = useState<ColorChart>(() => toChart(record));
  const [name, setName] = useState(record.name);
  // 기본 선택은 1번 색이다. 0번은 배경이라 그걸 골라두면 새 문양을 열고
  // 처음 드래그했을 때 아무 일도 일어나지 않는다.
  const [color, setColor] = useState(() => (record.palette.length > 1 ? 1 : 0));
  const [fromPhoto, setFromPhoto] = useState(false);
  const [row, setRow] = useState(0);
  const [repeats, setRepeats] = useState<{ x: number; y: number }>();
  const [zoom, setZoom] = useState(1);
  const [tool, setTool] = useState<Tool>("paint");
  /**
   * 대칭 그리기.
   *
   * 배색·레이스 무늬의 대부분이 좌우 대칭이라 작업량이 절반이 된다. 켠 상태를
   * 저장하지 않는 것은 이게 도안의 성질이 아니라 지금 손의 방식이기 때문이다 —
   * 대칭인 도안도 마무리는 한쪽만 손보게 된다.
   */
  const [symmetry, setSymmetry] = useState(false);
  /** 흑백으로 보기. 명도가 뭉치는지 눈으로 확인하는 보기 모드다. */
  const [gray, setGray] = useState(false);
  /**
   * 끼워넣거나 뺄 자리. 화면에 적힌 번호 그대로다 — 단은 아래가 1단,
   * 코는 오른쪽이 1번이다.
   */
  const [rowAt, setRowAt] = useState("1");
  const [stitchAt, setStitchAt] = useState("1");
  /** 색 일괄 교체의 두 색(팔레트 인덱스) */
  const [swapFrom, setSwapFrom] = useState(0);
  const [swapTo, setSwapTo] = useState(1);
  /**
   * 되돌리기 · 다시하기.
   *
   * 차트는 width × height 정수 배열이라 스냅샷이 싸다(20×20이면 400바이트).
   * diff를 만들 이유가 없어서 전체 사본을 쌓는다 — 50단계면 한 세션에서
   * 되돌릴 만큼이고 20KB를 넘지 않는다(docs/CHART-EDITOR.md §3.1).
   */
  const [past, setPast] = useState<ColorChart[]>([]);
  const [future, setFuture] = useState<ColorChart[]>([]);
  const wide = useWideEnough();

  /**
   * 되돌릴 수 있는 변경.
   *
   * 한 획(pointerdown → up)이 한 단위다. 획을 시작할 때 remember()로 지금
   * 상태를 쌓고, 획 중에는 chart만 갱신한다.
   */
  const remember = () => {
    setPast((prev) => [...prev.slice(-(HISTORY_LIMIT - 1)), chart]);
    // 새 변경이 들어오면 다시하기 갈래는 버린다 — 분기를 들고 있으면
    // 어느 쪽으로 돌아갈지 사용자가 알 수 없다.
    setFuture([]);
  };

  /** 한 번에 끝나는 변경(채우기·반전·크기·팔레트)은 기억과 적용을 함께 한다 */
  const commit = (next: ColorChart) => {
    remember();
    setChart(next);
  };

  const undo = () => {
    setPast((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setFuture((f) => [chart, ...f].slice(0, HISTORY_LIMIT));
      setChart(last);
      return prev.slice(0, -1);
    });
  };

  const redo = () => {
    setFuture((prev) => {
      if (prev.length === 0) return prev;
      const [next, ...rest] = prev;
      setPast((p) => [...p.slice(-(HISTORY_LIMIT - 1)), chart]);
      setChart(next);
      return rest;
    });
  };

  // 되돌린 결과도 저장된다 — 되돌리고 나갔다 돌아왔을 때 되돌리기 전 상태가
  // 남아 있으면 안 된다. 저장은 chart를 보고 있으므로 그대로 성립한다.
  useEffect(() => {
    const timer = setTimeout(() => void saveChart(chartId, chart), SAVE_DELAY);
    return () => clearTimeout(timer);
  }, [chart, chartId]);

  // 데스크톱에서 되돌리기는 단축키가 먼저 손에 온다
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (
        !(event.metaKey || event.ctrlKey) ||
        event.key.toLowerCase() !== "z"
      ) {
        return;
      }
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // 이름도 같은 방식으로 모아 저장한다. 글자마다 쓰면 입력이 밀린다.
  useEffect(() => {
    if (name === record.name) return;
    const timer = setTimeout(() => void renameChart(chartId, name), SAVE_DELAY);
    return () => clearTimeout(timer);
  }, [name, record.name, chartId]);

  const gauge = gauges.find((g) => g.id === record.gaugeId);
  const gaugeValues = gauge
    ? {
        // 블로킹 후 값이 있으면 그쪽이 완성 모양의 기준이다
        stitchesPer10cm: gauge.blockedStitchesPer10cm ?? gauge.stitchesPer10cm,
        rowsPer10cm: gauge.blockedRowsPer10cm ?? gauge.rowsPer10cm,
      }
    : null;

  const aspect = gaugeValues ? cellAspect(gaugeValues) : 1;
  const size = gaugeValues ? chartSizeCm(chart, gaugeValues) : null;
  const counts = stitchCounts(chart);
  const runs = rowRuns(chart, row);

  /*
    뒷실·명도 경고는 도안 전체를 훑는다. 칠하는 중에도 다시 계산되어야 하지만
    (그리는 중에 아는 것이 이 기능의 요점이다) 매 렌더마다 새 배열을 만들면
    격자가 이유 없이 다시 그려진다 — 캔버스가 이 값을 의존성으로 본다.
  */
  const inRound = record.inRound ?? false;
  const floatLimit = record.floatLimit ?? DEFAULT_FLOAT_LIMIT;
  const floats = useMemo(
    () => longFloats(chart, { threshold: floatLimit, inRound }),
    [chart, floatLimit, inRound]
  );
  const longestFloat = floats.reduce((max, f) => Math.max(max, f.count), 0);
  const contrast = useMemo(
    () => contrastWarnings(chart.palette),
    [chart.palette]
  );

  /**
   * 화면에 그릴 차트.
   *
   * 흑백 보기는 팔레트만 바꿔 같은 데이터를 그린다. 칠하기는 계속 원래 색으로
   * 들어간다 — 보기 모드가 저장되는 색을 바꾸면 안 된다.
   */
  const shown = useMemo(
    () => (gray ? { ...chart, palette: chart.palette.map(toGray) } : chart),
    [chart, gray]
  );

  const resize = (width: number, height: number) => {
    if (width < 1 || height < 1) return;
    commit(resizeChart(chart, Math.min(120, width), Math.min(200, height)));
  };

  /*
    반복 검산.

    무늬 반복은 기호 도안에서 이미 푼 문제라 fitRepeat을 그대로 쓴다. 격자 폭
    자체가 반복의 배수인지(그리는 중에 어긋나는지)와, 얹을 코수에 맞는지는
    다른 질문이라 둘 다 본다 — 20코 격자에 8코 무늬를 그리면 격자 안에서 이미
    어긋나고, 격자가 맞아도 118코 몸판에서는 남는다.
  */
  const repeatStitches = record.repeatStitches;
  const repeatRows = record.repeatRows;
  const chartFit = repeatStitches
    ? fitRepeat(chart.width, repeatStitches)
    : null;
  const castOnFit =
    repeatStitches && record.castOn
      ? fitRepeat(record.castOn, repeatStitches)
      : null;

  /** 화면 번호(아래가 1단)를 저장 좌표로 */
  const rowIndex = (num(rowAt) ?? 1) - 1;
  /**
   * 화면 번호(오른쪽이 1번)를 저장 좌표로.
   *
   * 넣기와 빼기가 자리 하나 다르다. `n번 자리에 넣기`는 원래 n번을 n+1번으로
   * 밀어야 하므로 그 오른쪽 경계에 들어가고, 빼기는 n번 그 칸이다.
   */
  const insertAt = chart.width - (num(stitchAt) ?? 1) + 1;
  const removeAt = chart.width - (num(stitchAt) ?? 1);

  /** 도형 도구인가 */
  const shape = tool === "line" || tool === "rect" ? tool : undefined;

  /** 도형을 확정한다. 대칭이 켜져 있으면 반대쪽 칸까지 한 단위로 칠한다. */
  const applyShape = (from: Point, to: Point) => {
    const points =
      shape === "rect" ? rectPoints(from, to) : linePoints(from, to);
    const all = symmetry
      ? [
          ...points,
          ...points.map((p) => ({ x: mirrorCell(chart, p.x), y: p.y })),
        ]
      : points;
    const next = paintPoints(chart, all, color);
    // 바뀔 것이 없으면 기억하지 않는다 — 아무 일도 하지 않는 되돌리기가 남는다
    if (next !== chart) commit(next);
  };

  return (
    <Page
      wide
      title={name || record.name}
      back={
        <Link to="/charts">
          <BackLink>
            <ChevronLeft size={16} />
            {t.chart.title}
          </BackLink>
        </Link>
      }
    >
      {/*
        왼쪽은 정하는 것(격자·게이지·색), 오른쪽은 하는 것(미리보기·그리기).
        전에는 설정과 작업이 한 줄로 쌓여 있어서 칠하다가 색을 바꾸려면 페이지를
        거슬러 올라가야 했다. 도구와 색은 격자 바로 위에 있어야 한다.
      */}
      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
        <aside className="order-last space-y-5 lg:sticky lg:top-8 lg:order-none">
          {/* 격자 크기 */}
          <section>
            <h2 className="text-micro text-text-3 mb-2">{t.chart.grid}</h2>
            <div className="flex items-end gap-2">
              <div className="w-20">
                <TextField
                  label={t.chart.widthLabel}
                  className="mb-0"
                  inputMode="numeric"
                  value={chart.width}
                  onChange={(e) =>
                    resize(Number(e.target.value) || 1, chart.height)
                  }
                />
              </div>
              <div className="w-20">
                <TextField
                  label={t.chart.heightLabel}
                  className="mb-0"
                  inputMode="numeric"
                  value={chart.height}
                  onChange={(e) =>
                    resize(chart.width, Number(e.target.value) || 1)
                  }
                />
              </div>
            </div>
            {size && (
              <p className="text-text-3 text-caption mt-2">
                {t.chart.finishedSize
                  .replace("{w}", units.formatLength(size.widthCm, 1))
                  .replace("{h}", units.formatLength(size.heightCm, 1))}
              </p>
            )}

            {/*
              중간에 끼워넣기 · 빼기.

              크기 입력은 끝에서 자란다. 실제 작업은 "여기 한 단이 더 필요하다"
              이고, 끝에서만 자라면 그 위를 전부 다시 그려야 한다.
              번호는 격자에 적힌 그대로다 — 단은 아래가 1단, 코는 오른쪽이 1번.
            */}
            <p className="text-text-3 text-caption mt-3">
              {t.chart.insertHint}
            </p>
            <div className="mt-1 space-y-1.5">
              <div className="flex items-end gap-1.5">
                <div className="w-20">
                  <TextField
                    label={t.chart.rowAt}
                    className="mb-0"
                    inputMode="numeric"
                    value={rowAt}
                    onChange={(e) => setRowAt(e.target.value)}
                  />
                </div>
                <Button
                  icon
                  variant="secondary"
                  aria-label={t.chart.insertRow}
                  title={t.chart.insertRow}
                  onClick={() => commit(insertRow(chart, rowIndex))}
                >
                  <Plus size={16} />
                </Button>
                <Button
                  icon
                  variant="secondary"
                  aria-label={t.chart.removeRow}
                  title={t.chart.removeRow}
                  disabled={chart.height <= 1}
                  onClick={() => commit(removeRow(chart, rowIndex))}
                >
                  <Minus size={16} />
                </Button>
              </div>
              <div className="flex items-end gap-1.5">
                <div className="w-20">
                  <TextField
                    label={t.chart.stitchAt}
                    className="mb-0"
                    inputMode="numeric"
                    value={stitchAt}
                    onChange={(e) => setStitchAt(e.target.value)}
                  />
                </div>
                <Button
                  icon
                  variant="secondary"
                  aria-label={t.chart.insertColumn}
                  title={t.chart.insertColumn}
                  onClick={() => commit(insertColumn(chart, insertAt))}
                >
                  <Plus size={16} />
                </Button>
                <Button
                  icon
                  variant="secondary"
                  aria-label={t.chart.removeColumn}
                  title={t.chart.removeColumn}
                  disabled={chart.width <= 1}
                  onClick={() => commit(removeColumn(chart, removeAt))}
                >
                  <Minus size={16} />
                </Button>
              </div>
            </div>
          </section>

          {/*
            반복 안내선 — 무늬가 다시 시작하는 자리.

            10코마다 넣는 관습선은 좌표를 세는 눈금이고, 이건 이 무늬의 경계다.
            얹을 코수를 넣으면 반복이 맞는지 검산한다.
          */}
          <section>
            <h2 className="text-micro text-text-3 mb-2">{t.chart.repeat}</h2>
            <div className="flex items-end gap-2">
              <div className="w-20">
                <TextField
                  label={t.chart.repeatStitches}
                  className="mb-0"
                  inputMode="numeric"
                  value={repeatStitches ?? ""}
                  onChange={(e) =>
                    void setChartRepeat(chartId, {
                      repeatStitches: num(e.target.value),
                    })
                  }
                />
              </div>
              <div className="w-20">
                <TextField
                  label={t.chart.repeatRows}
                  className="mb-0"
                  inputMode="numeric"
                  value={repeatRows ?? ""}
                  onChange={(e) =>
                    void setChartRepeat(chartId, {
                      repeatRows: num(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            {chartFit && (
              <p
                className={cn(
                  "text-caption mt-2",
                  chartFit.fits ? "text-text-3" : "text-hibernating"
                )}
              >
                {(chartFit.fits
                  ? t.chart.repeatChartFits
                  : t.chart.repeatChartOff
                )
                  .replace("{width}", String(chart.width))
                  .replace("{repeat}", String(chartFit.repeat))
                  .replace("{repeats}", String(chartFit.repeats))
                  .replace("{remainder}", String(chartFit.remainder))}
              </p>
            )}

            <div className="mt-2 w-24">
              <TextField
                label={t.chart.castOn}
                className="mb-0"
                inputMode="numeric"
                value={record.castOn ?? ""}
                onChange={(e) =>
                  void setChartRepeat(chartId, { castOn: num(e.target.value) })
                }
              />
            </div>
            {/* 조각에 저장된 코수가 있으면 손으로 옮겨 적지 않아도 된다 */}
            {pieces.some(hasStitches) && (
              <div className="mt-2 flex flex-wrap gap-2">
                {pieces.filter(hasStitches).map((piece) => (
                  <Button
                    key={piece.id}
                    variant="secondary"
                    className="!text-caption !min-h-9 !px-3"
                    onClick={() =>
                      void setChartRepeat(chartId, { castOn: piece.stitches })
                    }
                  >
                    {piece.name} {piece.stitches}
                  </Button>
                ))}
              </div>
            )}
            {castOnFit ? (
              <p
                className={cn(
                  "text-caption mt-2",
                  castOnFit.fits ? "text-finished" : "text-hibernating"
                )}
              >
                {(castOnFit.repeats === 0
                  ? t.chart.repeatNone
                  : castOnFit.fits
                    ? t.chart.repeatFits
                    : t.chart.repeatShort
                )
                  .replace("{total}", String(castOnFit.motifStitches))
                  .replace("{repeat}", String(castOnFit.repeat))
                  .replace("{repeats}", String(castOnFit.repeats))
                  .replace("{remainder}", String(castOnFit.remainder))}
              </p>
            ) : (
              <p className="text-text-3 text-caption mt-2">
                {t.chart.castOnHint}
              </p>
            )}
          </section>

          {/* 게이지 — 완성 모양과 완성 크기의 기준 */}
          <section>
            <SelectField
              label={t.chart.gauge}
              hint={gaugeValues ? undefined : t.chart.needGauge}
              className="mb-0"
              value={record.gaugeId ?? ""}
              onChange={(e) =>
                void setChartGauge(chartId, e.target.value || undefined)
              }
              options={[
                { value: "", label: t.chart.gaugeNone },
                ...gauges.map((g) => ({
                  value: g.id,
                  label:
                    g.label ??
                    t.gauge.summary
                      .replace("{sts}", String(g.stitchesPer10cm))
                      .replace("{rows}", String(g.rowsPer10cm)),
                })),
              ]}
            />
          </section>

          {/* 색 — 번호가 격자의 칸 번호와 같다 */}
          <section>
            <h2 className="text-micro text-text-3 mb-2">{t.chart.palette}</h2>
            <ul className="space-y-1.5">
              {chart.palette.map((hex, i) => (
                <li key={i} className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={t.chart.colorName.replace("{n}", String(i + 1))}
                    aria-pressed={color === i}
                    onClick={() => setColor(i)}
                    className={cn(
                      "text-small flex min-h-11 flex-1 items-center gap-2 rounded-md px-2 transition",
                      color === i
                        ? "bg-sunken ring-accent font-semibold ring-1"
                        : "hover:bg-sunken"
                    )}
                  >
                    <span
                      aria-hidden
                      className="ring-line size-6 shrink-0 rounded-sm ring-1 ring-inset"
                      style={{ background: hex }}
                    />
                    {/* 번호를 크게 둔다. 격자의 칸에 적히는 번호와 같은 것이라
                        "3번 색을 칠하는 중"이 한눈에 보여야 한다. */}
                    <span className="tabular-nums">{i + 1}</span>
                  </button>
                  <input
                    type="color"
                    aria-label={t.chart.colorName.replace("{n}", String(i + 1))}
                    value={hex}
                    onChange={(e) => {
                      const palette = chart.palette.slice();
                      palette[i] = e.target.value;
                      commit({ ...chart, palette });
                    }}
                    className="border-line size-8 shrink-0 cursor-pointer rounded-sm border bg-transparent p-0.5"
                  />
                </li>
              ))}
            </ul>
            <Button
              variant="secondary"
              className="mt-2 !min-h-9 !px-2"
              onClick={() =>
                commit({ ...chart, palette: [...chart.palette, "#b0603c"] })
              }
            >
              <Plus size={14} />
              {t.chart.addColor}
            </Button>

            {/*
              색 일괄 교체.

              팔레트의 hex를 고치는 것(위의 색 상자)과 다르다. 이건 칸이
              가리키는 색을 옮긴다 — 스태시 실이 모자라 이 색을 저 색으로
              갈아치우는 작업이고, 그때 다른 색은 그대로 있어야 한다.
            */}
            {chart.palette.length > 1 && (
              <div className="mt-3">
                <div className="flex items-end gap-1.5">
                  <div className="min-w-0 flex-1">
                    <SelectField
                      label={t.chart.swapFrom}
                      className="mb-0"
                      value={String(swapFrom)}
                      onChange={(e) => setSwapFrom(Number(e.target.value))}
                      options={chart.palette.map((_, i) => ({
                        value: String(i),
                        label: t.chart.colorName.replace("{n}", String(i + 1)),
                      }))}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <SelectField
                      label={t.chart.swapTo}
                      className="mb-0"
                      value={String(swapTo)}
                      onChange={(e) => setSwapTo(Number(e.target.value))}
                      options={chart.palette.map((_, i) => ({
                        value: String(i),
                        label: t.chart.colorName.replace("{n}", String(i + 1)),
                      }))}
                    />
                  </div>
                </div>
                <Button
                  variant="secondary"
                  className="mt-2 !min-h-9 !px-2"
                  disabled={swapFrom === swapTo || counts[swapFrom] === 0}
                  onClick={() => commit(remapColor(chart, swapFrom, swapTo))}
                >
                  <Replace size={14} />
                  {t.chart.swap.replace("{n}", String(counts[swapFrom] ?? 0))}
                </Button>
              </div>
            )}
          </section>

          {/*
            명도 대비 — 색이 달라도 명도가 비슷하면 무늬가 사라진다.
            팔레트 바로 아래에 둔다. 색을 고치는 손이 여기 있다.
          */}
          <section>
            <h2 className="text-micro text-text-3 mb-2">{t.chart.contrast}</h2>
            {contrast.length > 0 ? (
              <ul className="space-y-1">
                {contrast.map((pair) => (
                  <li
                    key={`${pair.a}-${pair.b}`}
                    className="text-hibernating text-caption flex items-center gap-1.5"
                  >
                    <span aria-hidden className="flex shrink-0">
                      <span
                        className="ring-line size-3 rounded-l-sm ring-1 ring-inset"
                        style={{ background: chart.palette[pair.a] }}
                      />
                      <span
                        className="ring-line size-3 rounded-r-sm ring-1 ring-inset"
                        style={{ background: chart.palette[pair.b] }}
                      />
                    </span>
                    {t.chart.contrastPair
                      .replace("{a}", String(pair.a + 1))
                      .replace("{b}", String(pair.b + 1))
                      .replace("{ratio}", pair.ratio.toFixed(1))}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-text-3 text-caption">{t.chart.contrastNone}</p>
            )}
            {/* 경고 문장보다 눈으로 보는 게 빠르다 */}
            <Button
              variant={gray ? "primary" : "secondary"}
              aria-pressed={gray}
              className="mt-2 !min-h-9 !px-2"
              onClick={() => setGray((on) => !on)}
            >
              <Contrast size={14} />
              {t.chart.grayscale}
            </Button>
            <p className="text-text-3 text-caption mt-1">
              {t.chart.grayscaleHint}
            </p>
          </section>

          {/*
            뒷실 — 다 뜨고 뒤집어 봐야 아는 실수라서 그리는 중에 말해준다.
            평면·원형 구분이 여기 있어야 맞는다. 원형은 단의 끝과 시작이 이어져서
            끝 3코 + 시작 4코가 실제로는 7코 하나다.
          */}
          <section>
            <h2 className="text-micro text-text-3 mb-2">{t.chart.floats}</h2>
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <SelectField
                  label={t.chart.shape}
                  className="mb-0"
                  value={inRound ? "round" : "flat"}
                  onChange={(e) =>
                    void setChartFloats(chartId, {
                      inRound: e.target.value === "round",
                    })
                  }
                  options={[
                    { value: "flat", label: t.chart.flat },
                    { value: "round", label: t.chart.inRound },
                  ]}
                />
              </div>
              <div className="w-24">
                <SelectField
                  label={t.chart.floatLimit}
                  className="mb-0"
                  value={String(floatLimit)}
                  onChange={(e) =>
                    void setChartFloats(chartId, {
                      floatLimit: Number(e.target.value),
                    })
                  }
                  options={FLOAT_LIMITS.map((n) => ({
                    value: String(n),
                    label: t.chart.countsValue.replace("{n}", String(n)),
                  }))}
                />
              </div>
            </div>
            <p
              className={cn(
                "text-caption mt-2",
                floats.length > 0 ? "text-hibernating" : "text-text-3"
              )}
            >
              {floats.length > 0
                ? t.chart.floatSummary
                    .replace("{n}", String(floats.length))
                    .replace("{max}", String(longestFloat))
                : t.chart.floatNone}
            </p>
            {/*
              뒷실이 무엇인지는 언제나 말한다. 전에는 원형일 때 이 자리를
              `inRoundHint`가 차지해서, 원형으로 뜨는 사람은 뒷실이 뭔지
              끝까지 못 봤다. 원형 설명은 덧붙이는 말이지 대신하는 말이 아니다.

              "기준"이 몇 코를 뜻하는지도 적는다. 고를 수는 있는데 5가 흔한
              값이라는 건 화면 어디에도 없었다 — 고를 수 있게 해두고 무엇을
              고르면 되는지 안 알려주면 고를 수 없다(디자인 원칙 5).
            */}
            <p className="text-text-3 text-caption mt-1">
              {t.chart.floatsHint}
              {inRound && ` ${t.chart.inRoundHint}`}
            </p>
            <p className="text-text-3 text-caption mt-1">
              {t.chart.floatLimitHint}
            </p>
          </section>

          {/* 사진에서 옮기기 — 칸을 하나씩 칠하는 대신 사진을 통째로 옮긴다 */}
          <section>
            {fromPhoto ? (
              <div className="border-line rounded-md border p-3">
                <h2 className="text-micro text-text-3 mb-2">
                  {t.photoChart.title}
                </h2>
                <PhotoToChart
                  width={chart.width}
                  height={chart.height}
                  onApply={(next) => {
                    commit(next);
                    setFromPhoto(false);
                  }}
                />
                <Button
                  variant="ghost"
                  className="mt-2"
                  onClick={() => setFromPhoto(false)}
                >
                  {t.action.cancel}
                </Button>
              </div>
            ) : (
              <Button variant="secondary" onClick={() => setFromPhoto(true)}>
                <ImagePlus size={16} />
                {t.photoChart.open}
              </Button>
            )}
          </section>
        </aside>

        <div className="space-y-5">
          {/* 완성 모양 — 같은 데이터를 게이지 비율로, 천처럼, 반복해서 그린다 */}
          <section>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h2 className="text-micro text-text-3">{t.chart.preview}</h2>
              <div className="flex gap-1">
                {PREVIEW_ZOOMS.map((_, level) => (
                  <button
                    key={level}
                    type="button"
                    aria-pressed={zoom === level}
                    onClick={() => setZoom(level)}
                    className={cn(
                      "text-caption min-h-9 rounded-sm px-2 transition",
                      zoom === level
                        ? "bg-accent text-on-accent font-semibold"
                        : "bg-sunken text-text-2"
                    )}
                  >
                    {t.chart.zoomLevel[level]}
                  </button>
                ))}
              </div>
            </div>

            {/*
              게이지가 없어도 그린다.

              게이지가 정하는 것은 **비율 하나**다(cellAspect). 없으면 정사각
              격자로 깔면 되고, 무늬가 반복 경계에서 어떻게 이어지는지·색이 섞여
              보이는지는 비율과 무관하게 보인다 — 여기서 궁금한 건 대개 그쪽이다.
              게이지를 저장한 적 없는 사람에게 미리보기를 통째로 막으면, 스와치를
              뜨기 전에는 도안을 볼 수 없다는 뜻이 된다.
            */}
            <div className="border-line bg-surface overflow-hidden rounded-md border">
              <FabricCanvas
                chart={shown}
                cellWidth={PREVIEW_ZOOMS[zoom] * aspect}
                cellHeight={PREVIEW_ZOOMS[zoom]}
                height={wide ? FABRIC_HEIGHT : FABRIC_HEIGHT_NARROW}
                onRepeats={setRepeats}
              />
            </div>
            <p className="text-text-2 text-small mt-2">
              {repeats &&
                t.chart.repeatedAs
                  .replace("{x}", String(repeats.x))
                  .replace("{y}", String(repeats.y))}
            </p>
            {/* 비율이 실제와 다르다는 것만 알린다. 막지는 않는다. */}
            {!gaugeValues && (
              <p className="text-text-3 text-caption">
                {t.chart.previewSquare}
              </p>
            )}
          </section>

          {/* 그리기 — 도구와 색이 격자 바로 위에 있다 */}
          <section>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <div className="flex gap-1">
                {TOOLS.map(({ id, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={tool === id}
                    aria-label={t.chart.tool[id]}
                    onClick={() => setTool(id)}
                    className={cn(
                      "text-caption inline-flex min-h-11 items-center gap-1.5 rounded-md px-2.5 transition",
                      tool === id
                        ? "bg-accent text-on-accent font-semibold"
                        : "bg-sunken text-text-2 hover:text-text"
                    )}
                  >
                    <Icon size={16} />
                    {t.chart.tool[id]}
                  </button>
                ))}
              </div>

              {/*
                대칭 그리기. 전체를 뒤집는 좌우 반전과는 다른 기능이라 도구 옆에
                둔다 — 이건 지금부터 칠하는 방식이고, 반전은 한 번의 조작이다.
              */}
              <button
                type="button"
                aria-pressed={symmetry}
                title={t.chart.symmetryHint}
                onClick={() => setSymmetry((on) => !on)}
                className={cn(
                  "text-caption inline-flex min-h-11 items-center gap-1.5 rounded-md px-2.5 transition",
                  symmetry
                    ? "bg-accent text-on-accent font-semibold"
                    : "bg-sunken text-text-2 hover:text-text"
                )}
              >
                <FlipHorizontal size={16} />
                {t.chart.symmetry}
              </button>

              {/* 지금 칠하는 색을 도구 옆에 둔다. 색을 바꾸려고 페이지를
                  거슬러 올라가야 했던 게 이 화면의 가장 큰 불편이었다. */}
              <div className="border-line flex items-center gap-1 rounded-md border px-1.5">
                {chart.palette.map((hex, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={t.chart.colorName.replace("{n}", String(i + 1))}
                    aria-pressed={color === i}
                    onClick={() => setColor(i)}
                    className={cn(
                      "my-1 size-8 rounded-sm ring-1 transition ring-inset",
                      color === i
                        ? "ring-accent outline-accent outline-2 outline-offset-1"
                        : "ring-line"
                    )}
                    style={{ background: hex }}
                  />
                ))}
              </div>

              <div className="ml-auto flex gap-1">
                <Button
                  icon
                  variant="secondary"
                  onClick={() => commit(mirrorChart(chart))}
                  aria-label={t.chart.mirror}
                  title={t.chart.mirror}
                >
                  <FlipHorizontal2 size={16} />
                </Button>
                <Button
                  icon
                  variant="secondary"
                  onClick={undo}
                  disabled={past.length === 0}
                  aria-label={t.chart.undo}
                  title={t.chart.undo}
                >
                  <Undo2 size={16} />
                </Button>
                <Button
                  icon
                  variant="secondary"
                  onClick={redo}
                  disabled={future.length === 0}
                  aria-label={t.chart.redo}
                  title={t.chart.redo}
                >
                  <Redo2 size={16} />
                </Button>
              </div>
            </div>

            <p className="text-text-3 text-caption mb-2">
              {t.chart.editingHint}
            </p>

            <div className="border-line overflow-auto rounded-md border p-2">
              <ChartCanvas
                chart={shown}
                cellWidth={EDIT_CELL}
                cellHeight={EDIT_CELL}
                labels
                floats={floats}
                repeatStitches={repeatStitches}
                repeatRows={repeatRows}
                shape={shape}
                color={color}
                onShape={applyShape}
                continuous={tool === "paint"}
                onStrokeStart={tool === "pick" || shape ? undefined : remember}
                onPaint={(x, y) => {
                  if (tool === "pick") {
                    // 색을 집는 이유는 그 색으로 칠하려는 것이다
                    setColor(getCell(chart, x, y));
                    setTool("paint");
                    return;
                  }
                  if (tool === "fill") {
                    setChart((prev) => {
                      const filled = fillArea(prev, x, y, color);
                      if (!symmetry) return filled;
                      // 영역을 뒤집어 옮기는 것이 아니라 **같은 조작을 반대쪽에
                      // 한 번 더** 한다. 비대칭 영역에서도 결과를 예상할 수 있고,
                      // 두 영역의 모양이 다를 때 한쪽이 뭉개지지 않는다.
                      return fillArea(filled, mirrorCell(prev, x), y, color);
                    });
                    return;
                  }
                  // 함수형 갱신을 쓴다. 클로저의 chart를 읽으면 같은 tick에
                  // 여러 포인터 이벤트가 오갈 때 앞서 칠한 칸이 덮여 사라진다.
                  setChart((prev) => {
                    const painted = setCell(prev, x, y, color);
                    if (!symmetry) return painted;
                    // 폭이 홀수면 가운데 열은 자기 자신이 짝이다. 같은 칸을 두 번
                    // 칠해도 결과가 같으므로 여기서 홀짝을 따지지 않는다.
                    return setCell(painted, mirrorCell(prev, x), y, color);
                  });
                }}
              />
            </div>
          </section>
        </div>
      </div>

      {/* 색별 코수 — 실을 몇 타래 살지 가늠하는 근거 */}
      <section className="mt-6">
        <h2 className="text-micro text-text-3 mb-2">{t.chart.counts}</h2>
        <ul className="flex flex-wrap gap-2">
          {counts.map((n, i) => (
            <li
              key={i}
              className="border-line bg-surface flex items-center gap-2 rounded-md border px-3 py-2"
            >
              <span
                aria-hidden
                className="ring-line size-4 rounded-sm ring-1 ring-inset"
                style={{ background: chart.palette[i] }}
              />
              <span className="text-small">
                {t.chart.countsValue.replace("{n}", String(n))}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* 단별 읽기 — 뜨는 사람은 칸을 하나씩 보지 않고 "A 5코"로 읽는다 */}
      <section className="mt-6">
        <h2 className="text-micro text-text-3 mb-1">{t.chart.readRow}</h2>
        <p className="text-text-3 text-caption mb-2">{t.chart.readRowHint}</p>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={chart.height - 1}
            value={row}
            onChange={(e) => setRow(Number(e.target.value))}
            className="min-w-0 flex-1"
            aria-label={t.chart.readRow}
          />
          <span className="text-small shrink-0 font-medium">
            {t.chart.rowLabel.replace("{n}", String(row + 1))}
          </span>
        </div>
        <p className="text-small mt-2 flex flex-wrap gap-x-2 gap-y-1">
          {runs.map((run, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              <span
                aria-hidden
                className="ring-line size-3 rounded-sm ring-1 ring-inset"
                style={{ background: chart.palette[run.color] }}
              />
              {t.chart.countsValue.replace("{n}", String(run.count))}
            </span>
          ))}
        </p>
      </section>

      <div className="border-line mt-6 flex items-center gap-2 border-t pt-4">
        <div className="min-w-0 flex-1">
          <TextField
            label={t.chart.name}
            className="mb-0"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <Button variant="secondary" onClick={() => navigate({ to: "/charts" })}>
          {t.action.back}
        </Button>
      </div>
    </Page>
  );
}
