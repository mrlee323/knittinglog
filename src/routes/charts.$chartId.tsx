import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, FlipHorizontal2, ImagePlus, Plus } from "lucide-react";
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
  setChartGauge,
  toChart,
} from "@/features/chart/repository";
import { listGauges } from "@/features/gauge/repository";
import {
  cellAspect,
  chartSizeCm,
  mirrorChart,
  resizeChart,
  rowRuns,
  setCell,
  stitchCounts,
  type ColorChart,
} from "@/domain/colorChart";
import { useUnits } from "@/app/units";
import { useWideEnough } from "@/lib/use-media-query";
import { useStrings } from "@/i18n";
import { cn } from "@/lib/utils";
import type { ColorChartRecord, GaugeRecord } from "@/types/entities";

export const Route = createFileRoute("/charts/$chartId")({
  component: ChartEditor,
});

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

  if (!record) return null;
  return <Editor key={record.id} record={record} gauges={gauges ?? []} />;
}

function Editor({
  record,
  gauges,
}: {
  record: ColorChartRecord;
  gauges: GaugeRecord[];
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
  const wide = useWideEnough();

  useEffect(() => {
    const timer = setTimeout(() => void saveChart(chartId, chart), SAVE_DELAY);
    return () => clearTimeout(timer);
  }, [chart, chartId]);

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

  const resize = (width: number, height: number) => {
    if (width < 1 || height < 1) return;
    setChart(resizeChart(chart, Math.min(120, width), Math.min(200, height)));
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
      {/* 팔레트 — 칠할 색을 고른다 */}
      <section className="mb-5">
        <h2 className="text-micro text-text-3 mb-2">{t.chart.palette}</h2>
        <div className="flex flex-wrap items-center gap-2">
          {chart.palette.map((hex, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <button
                type="button"
                aria-label={t.chart.colorName.replace("{n}", String(i + 1))}
                aria-pressed={color === i}
                onClick={() => setColor(i)}
                className={cn(
                  "size-9 rounded-sm ring-1 transition ring-inset",
                  color === i
                    ? "ring-accent outline-accent outline-2 outline-offset-2"
                    : "ring-line"
                )}
                style={{ background: hex }}
              />
              {/* 색을 바꾸는 건 팔레트에서만 한다. 칸마다 색을 넣으면
                  같은 색을 여러 칸에서 따로 고치는 일이 생긴다. */}
              <input
                type="color"
                aria-label={t.chart.colorName.replace("{n}", String(i + 1))}
                value={hex}
                onChange={(e) => {
                  const palette = chart.palette.slice();
                  palette[i] = e.target.value;
                  setChart({ ...chart, palette });
                }}
                className="border-line size-6 cursor-pointer rounded-sm border bg-transparent p-0.5"
              />
            </div>
          ))}
          <Button
            variant="secondary"
            className="!min-h-9 !px-2"
            onClick={() =>
              setChart({ ...chart, palette: [...chart.palette, "#b0603c"] })
            }
          >
            <Plus size={14} />
            {t.chart.addColor}
          </Button>
        </div>
      </section>

      {/* 사진에서 옮기기 — 칸을 하나씩 칠하는 대신 사진을 통째로 옮긴다.
          팔레트를 스태시 색으로 고정할 수 있는 게 이 기능의 요점이다. */}
      {fromPhoto ? (
        <section className="border-line mb-5 rounded-md border p-3">
          <h2 className="text-micro text-text-3 mb-2">{t.photoChart.title}</h2>
          <PhotoToChart
            width={chart.width}
            height={chart.height}
            // 사진 쪽에서 칸 수를 바꿀 수 있으므로 차트를 통째로 갈아끼운다.
            // palette·cells만 받으면 width×height와 cells.length가 어긋난다.
            onApply={(next) => {
              setChart(next);
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
        </section>
      ) : (
        <Button
          variant="secondary"
          className="mb-5"
          onClick={() => setFromPhoto(true)}
        >
          <ImagePlus size={16} />
          {t.photoChart.open}
        </Button>
      )}

      {/* 크기·반전 */}
      <section className="mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-24">
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
          <div className="w-24">
            <TextField
              label={t.chart.heightLabel}
              className="mb-0"
              inputMode="numeric"
              value={chart.height}
              onChange={(e) => resize(chart.width, Number(e.target.value) || 1)}
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => setChart(mirrorChart(chart))}
          >
            <FlipHorizontal2 size={16} />
            {t.chart.mirror}
          </Button>
        </div>

        {/* 완성 크기는 격자 옆에 둔다. 미리보기의 기준이 아니라 이 격자가 실제로
            몇 cm가 되는지에 대한 답이고, 게이지를 골랐을 때만 말할 수 있다. */}
        {size && (
          <p className="text-text-3 text-caption mt-2">
            {t.chart.finishedSize
              .replace("{w}", units.formatLength(size.widthCm, 1))
              .replace("{h}", units.formatLength(size.heightCm, 1))}
          </p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 편집 격자 — 정사각형으로 둔다. 칠하기 쉬워야 한다. */}
        <section>
          <h2 className="text-micro text-text-3 mb-1">{t.chart.editing}</h2>
          <p className="text-text-3 text-caption mb-2">{t.chart.editingHint}</p>
          <div className="border-line overflow-auto rounded-md border p-2">
            <ChartCanvas
              chart={chart}
              cellWidth={EDIT_CELL}
              cellHeight={EDIT_CELL}
              // 함수형 갱신을 쓴다. 클로저의 chart를 읽으면 같은 tick에 여러
              // 포인터 이벤트가 오갈 때 앞서 칠한 칸이 덮여 사라진다 —
              // 빠르게 그을 때 점이 띄엄띄엄 찍히는 증상이 이것이다.
              onPaint={(x, y) => setChart((prev) => setCell(prev, x, y, color))}
            />
          </div>
        </section>

        {/* 완성 모양 — 같은 데이터를 게이지 비율로, 천처럼, 반복해서 그린다.
            **좁은 화면에서는 위에 붙여둔다.** 칠하는 동안 보이지 않으면
            "색칠하면 어떻게 보이나"에 답하지 못한다 — 폰에서 격자 아래에 두면
            칠하는 내내 화면 밖이다. */}
        <section className="bg-canvas sticky top-0 z-10 order-first pb-2 lg:static lg:order-none lg:pb-0">
          {/* 좁은 화면에서는 이 자리가 위에 붙어 있으므로 설명을 접는다.
              붙어 있는 것이 두꺼우면 격자 윗줄을 가려서 칠할 수 없다 —
              그림이 설명을 대신한다. */}
          <div className={gaugeValues ? "hidden lg:block" : undefined}>
            <h2 className="text-micro text-text-3 mb-1">{t.chart.preview}</h2>
            <p className="text-text-3 text-caption mb-2">
              {gaugeValues ? t.chart.previewHint : t.chart.needGauge}
            </p>
          </div>

          {/* 게이지 선택은 넓은 화면에서만 이 자리에 둔다. 좁은 화면에서는
              위에 붙는 자리라 셀렉트가 격자를 가린다. */}
          <div className={gaugeValues ? "hidden lg:block" : undefined}>
            <SelectField
              label={t.chart.gauge}
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
          </div>

          {gaugeValues && (
            <>
              {/* 무늬 한 번이 아니라 **깔린 모습**을 보여준다. 한 번은 예뻐도
                  여러 번 이으면 줄무늬처럼 보이거나 반복 경계가 눈에 띄는
                  무늬가 있는데, 그건 옷을 다 뜬 뒤에 알게 된다. */}
              <div className="border-line bg-surface overflow-hidden rounded-md border">
                <FabricCanvas
                  chart={chart}
                  cellWidth={PREVIEW_ZOOMS[zoom] * aspect}
                  cellHeight={PREVIEW_ZOOMS[zoom]}
                  height={wide ? FABRIC_HEIGHT : FABRIC_HEIGHT_NARROW}
                  onRepeats={setRepeats}
                />
              </div>

              {/* 크기 기준은 줌이다. 크게 보면 코가 보이고, 작게 보면 무늬가
                  여러 번 이어진 모습이 보인다 — 둘 다 필요한 시야다. */}
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-text-2 text-small">
                  {repeats &&
                    t.chart.repeatedAs
                      .replace("{x}", String(repeats.x))
                      .replace("{y}", String(repeats.y))}
                </p>
                <div className="flex gap-1">
                  {PREVIEW_ZOOMS.map((_, level) => (
                    <button
                      key={level}
                      type="button"
                      aria-pressed={zoom === level}
                      aria-label={t.chart.zoomLevel[level]}
                      onClick={() => setZoom(level)}
                      className={cn(
                        "text-caption min-h-11 rounded-sm px-2.5 transition",
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
            </>
          )}
        </section>
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
