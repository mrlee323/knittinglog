import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Check,
  ChevronLeft,
  FlipHorizontal2,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import { BackLink, Page } from "@/components/ui/page";
import { SegmentedControl } from "@/components/ui/segmented";
import {
  SymbolCanvas,
  SymbolSwatch,
} from "@/features/stitchChart/components/symbol-canvas";
import {
  getStitchChart,
  renameStitchChart,
  saveStitchChart,
  setStitchChartCastOn,
  setStitchChartGauge,
  setStitchChartReading,
  toStitchChart,
} from "@/features/stitchChart/repository";
import { listGauges } from "@/features/gauge/repository";
import {
  cellAspect,
  mirrorStitchChart,
  opCounts,
  opRuns,
  resizeStitchChart,
  rowSide,
  setOp,
  stitchChartSizeCm,
  usedOps,
  verifyChart,
  type Reading,
  type Side,
  type StitchChart,
} from "@/domain/stitchChart";
import type { Construction } from "@/domain/construction";
import { chartOps } from "@/domain/stitches";
import {
  DEFAULT_SELVEDGE,
  equivalentTotal,
  planConversion,
  tileChart,
  type ConversionNote,
} from "@/domain/construction";
import { formatRow, stitchLabel } from "@/i18n/stitches";
import { useUnits } from "@/app/units";
import {
  LOCALE_NAMES,
  LOCALES,
  useLocale,
  useStrings,
  type Locale,
} from "@/i18n";
import { cn } from "@/lib/utils";
import type { GaugeRecord, StitchChartRecord } from "@/types/entities";

export const Route = createFileRoute("/patterns/$patternId")({
  component: PatternEditor,
});

/** 심볼은 색과 달리 형태를 읽어야 하므로 편집 격자를 색상 차트보다 크게 둔다 */
const EDIT_CELL = 26;
const PREVIEW_CELL = 12;
/** 늘어놓기는 코수가 많아 칸을 작게 둔다 — 끊기는 자리만 보이면 된다 */
const TILE_CELL = 14;
const SAVE_DELAY = 400;

function PatternEditor() {
  const { patternId } = Route.useParams();
  const record = useLiveQuery(() => getStitchChart(patternId), [patternId]);
  const gauges = useLiveQuery(() => listGauges(), []);

  if (!record) return null;
  // record.id로 키를 걸어 마운트할 때만 상태를 씨딩한다. DB가 바뀔 때마다
  // 로컬 상태를 덮어쓰면 저장이 늦게 도착할 때 방금 찍은 칸이 되돌아간다.
  return <Editor key={record.id} record={record} gauges={gauges ?? []} />;
}

function Editor({
  record,
  gauges,
}: {
  record: StitchChartRecord;
  gauges: GaugeRecord[];
}) {
  const t = useStrings();
  const units = useUnits();
  const locale = useLocale();
  const navigate = useNavigate();
  const chartId = record.id;

  const [chart, setChart] = useState<StitchChart>(() => toStitchChart(record));
  const [name, setName] = useState(record.name);
  // 기본 선택은 안뜨기다. 겉뜨기는 격자의 바탕이라 그걸 골라두면 처음
  // 드래그했을 때 아무 일도 일어나지 않는다(빈 칸에 빈 칸을 찍는 셈).
  const [op, setSelectedOp] = useState("purl");
  const [castOn, setCastOnText] = useState(
    record.castOn === undefined ? "" : String(record.castOn)
  );
  // 서술형은 앱 언어와 따로 고른다 — 한국어로 쓰면서 영문 도안을 뽑는 것이
  // 이 기능의 목적이다(기획 §4).
  const [proseLocale, setProseLocale] = useState<Locale>(locale);
  // 시접 코수는 화면의 값으로 둔다 — 무늬가 아니라 이 옷을 어떻게 마무리할지의
  // 문제이고, 코수 계산을 해보는 동안 이리저리 바꿔보게 된다.
  const [selvedge, setSelvedge] = useState(DEFAULT_SELVEDGE);

  useEffect(() => {
    const timer = setTimeout(
      () => void saveStitchChart(chartId, chart),
      SAVE_DELAY
    );
    return () => clearTimeout(timer);
  }, [chart, chartId]);

  useEffect(() => {
    if (name === record.name) return;
    const timer = setTimeout(
      () => void renameStitchChart(chartId, name),
      SAVE_DELAY
    );
    return () => clearTimeout(timer);
  }, [name, record.name, chartId]);

  const reading: Reading = {
    flat: record.flat ?? false,
    firstSide: record.firstRowSide ?? "rs",
  };
  const sideLabel = (side: Side) =>
    side === "rs" ? t.pattern.sideRs : t.pattern.sideWs;

  const gauge = gauges.find((g) => g.id === record.gaugeId);
  const gaugeValues = gauge
    ? {
        stitchesPer10cm: gauge.blockedStitchesPer10cm ?? gauge.stitchesPer10cm,
        rowsPer10cm: gauge.blockedRowsPer10cm ?? gauge.rowsPer10cm,
      }
    : null;

  const aspect = gaugeValues ? cellAspect(gaugeValues) : 1;
  const size = gaugeValues ? stitchChartSizeCm(chart, gaugeValues) : null;
  const balance = verifyChart(chart);
  const badRows = balance.rows.filter((r) => !r.ok).map((r) => r.row - 1);
  const counts = opCounts(chart);
  const legend = usedOps(chart);

  const resize = (width: number, height: number) => {
    if (width < 1 || height < 1) return;
    setChart(
      resizeStitchChart(chart, Math.min(120, width), Math.min(200, height))
    );
  };

  const commitCastOn = (text: string) => {
    setCastOnText(text);
    const n = Number(text);
    void setStitchChartCastOn(
      chartId,
      text.trim() === "" || !Number.isFinite(n) || n < 1
        ? undefined
        : Math.floor(n)
    );
  };

  return (
    <Page
      wide
      title={name || record.name}
      back={
        <Link to="/patterns">
          <BackLink>
            <ChevronLeft size={16} />
            {t.pattern.title}
          </BackLink>
        </Link>
      }
    >
      {/* 기법 고르기 — 배색 도안의 팔레트에 해당한다 */}
      <section className="mb-5">
        <h2 className="text-micro text-text-3 mb-1">{t.pattern.stitches}</h2>
        <p className="text-text-3 text-caption mb-2">
          {t.pattern.stitchesHint}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {chartOps("knit").map((candidate) => (
            <button
              key={candidate}
              type="button"
              aria-pressed={op === candidate}
              // 버튼에 보이는 건 축약형이라 소리로 들으면 모호하다
              // ("1코2단"). 전개형을 이름으로 준다.
              aria-label={stitchLabel(candidate, locale, "long")}
              onClick={() => setSelectedOp(candidate)}
              className={cn(
                "flex items-center gap-1.5 rounded-sm px-2 py-1.5 ring-1 transition ring-inset",
                op === candidate
                  ? "ring-accent bg-sunken outline-accent outline-2 outline-offset-1"
                  : "ring-line hover:bg-sunken"
              )}
            >
              {/* 겉뜨기는 빈 칸이라 심볼만으로는 고를 수 없다 — 이름을 함께
                  보여주는 이유이자, 범례가 필요한 이유이기도 하다 */}
              <span className="border-line rounded-xs border">
                <SymbolSwatch op={candidate} size={22} />
              </span>
              <span className="text-caption">
                {stitchLabel(candidate, locale, "short")}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 크기·반전 */}
      <section className="mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-24">
            <TextField
              label={t.pattern.widthLabel}
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
              label={t.pattern.heightLabel}
              className="mb-0"
              inputMode="numeric"
              value={chart.height}
              onChange={(e) => resize(chart.width, Number(e.target.value) || 1)}
            />
          </div>
          <div>
            <Button
              variant="secondary"
              onClick={() => setChart(mirrorStitchChart(chart))}
            >
              <FlipHorizontal2 size={16} />
              {t.pattern.mirror}
            </Button>
          </div>
        </div>
        {/* 색에는 기울기가 없어서 배색 도안에는 없던 설명이다 */}
        <p className="text-text-3 text-caption mt-2">{t.pattern.mirrorHint}</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-micro text-text-3 mb-1">{t.pattern.editing}</h2>
          <p className="text-text-3 text-caption mb-2">
            {t.pattern.editingHint}
          </p>
          <div className="border-line overflow-auto rounded-md border p-2">
            <SymbolCanvas
              chart={chart}
              cellWidth={EDIT_CELL}
              cellHeight={EDIT_CELL}
              badRows={badRows}
              // 함수형 갱신을 쓴다. 클로저의 chart를 읽으면 같은 tick에 여러
              // 포인터 이벤트가 오갈 때 앞서 찍은 칸이 덮여 사라진다.
              onPaint={(x, y) => setChart((prev) => setOp(prev, x, y, op))}
            />
          </div>
        </section>

        <section>
          <h2 className="text-micro text-text-3 mb-1">{t.pattern.preview}</h2>
          <p className="text-text-3 text-caption mb-2">
            {gaugeValues ? t.pattern.previewHint : t.pattern.needGauge}
          </p>

          <SelectField
            label={t.pattern.gauge}
            value={record.gaugeId ?? ""}
            onChange={(e) =>
              void setStitchChartGauge(chartId, e.target.value || undefined)
            }
            options={[
              { value: "", label: t.pattern.gaugeNone },
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

          {gaugeValues && (
            <>
              <div className="border-line bg-surface overflow-auto rounded-md border p-3">
                <SymbolCanvas
                  chart={chart}
                  cellWidth={PREVIEW_CELL * aspect}
                  cellHeight={PREVIEW_CELL}
                  grid={false}
                />
              </div>
              {size && (
                <p className="text-text-2 text-small mt-2">
                  {t.pattern.finishedSize
                    .replace("{w}", units.formatLength(size.width, 1))
                    .replace("{h}", units.formatLength(size.height, 1))}
                </p>
              )}
            </>
          )}
        </section>
      </div>

      {/* 코수 검산 — 도안을 구조로 저장하는 가장 실용적인 이유(기획 §4).
          손으로 세다 놓치면 몇 시간 뜬 뒤에 알게 된다. */}
      <section className="mt-6">
        <h2 className="text-micro text-text-3 mb-1">{t.pattern.verify}</h2>
        <p className="text-text-3 text-caption mb-2">{t.pattern.verifyHint}</p>

        {balance.ok ? (
          <p className="text-finished text-small flex items-center gap-1.5">
            <Check size={15} className="shrink-0" />
            {t.pattern.verifyOk
              .replace("{start}", String(balance.startStitches))
              .replace("{end}", String(balance.finalCount))}
          </p>
        ) : (
          <div>
            <p className="text-frogged text-small mb-2 flex items-center gap-1.5">
              <TriangleAlert size={15} className="shrink-0" />
              {t.pattern.verifyBad.replace("{n}", String(badRows.length))}
            </p>
            <ul className="text-small space-y-1">
              {balance.rows
                .filter((r) => !r.ok)
                .map((r) => (
                  <li key={r.row} className="text-text-2">
                    {t.pattern.verifyRow
                      .replace("{row}", String(r.row))
                      .replace("{expected}", String(r.expected))
                      .replace("{consumes}", String(r.consumes))}
                  </li>
                ))}
            </ul>
          </div>
        )}
      </section>

      {/* 서술형 도안 — 같은 구조에서 두 언어가 나온다. 한↔영 도안 변환의
          출발점이고, 기계번역이 아니라 결정적 기호 변환이다(기획 §4). */}
      <section className="mt-6">
        <h2 className="text-micro text-text-3 mb-1">{t.pattern.prose}</h2>
        <p className="text-text-3 text-caption mb-1">{t.pattern.proseHint}</p>
        {/* 안면 변환이 무슨 일을 하는지는 평면일 때만 알려주면 된다 */}
        {reading.flat && (
          <p className="text-text-3 text-caption mb-1">
            {t.pattern.proseWsNote}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-x-6">
          <SegmentedControl<"round" | "flat">
            className="mb-2 max-w-xs grow basis-48"
            label={t.pattern.reading}
            value={reading.flat ? "flat" : "round"}
            onChange={(value) =>
              void setStitchChartReading(chartId, {
                ...reading,
                flat: value === "flat",
              })
            }
            options={[
              { value: "round", label: t.pattern.readingRound },
              { value: "flat", label: t.pattern.readingFlat },
            ]}
          />
          {/* 원형에는 시작 면이라는 개념이 없다 — 뒤집는 일이 없으므로 */}
          {reading.flat && (
            <SegmentedControl<Side>
              className="mb-2 max-w-xs grow basis-48"
              label={t.pattern.firstSide}
              value={reading.firstSide}
              onChange={(firstSide) =>
                void setStitchChartReading(chartId, { ...reading, firstSide })
              }
              options={[
                { value: "rs", label: t.pattern.sideRs },
                { value: "ws", label: t.pattern.sideWs },
              ]}
            />
          )}
        </div>
        <p className="text-text-3 text-caption mb-3">{t.pattern.readingHint}</p>

        <SegmentedControl<Locale>
          className="max-w-xs"
          label={t.pattern.proseLocale}
          value={proseLocale}
          onChange={setProseLocale}
          options={LOCALES.map((code) => ({
            value: code,
            label: LOCALE_NAMES[code],
          }))}
        />

        {/* 위 단부터 읽지 않는다 — 도안은 1단부터 뜨므로 아래에서 위로 적는다 */}
        <ol className="text-small space-y-1">
          {Array.from({ length: chart.height }, (_, y) => {
            const side = rowSide(y, reading);
            return (
              <li key={y} className="flex gap-2">
                <span className="text-text-3 w-12 shrink-0 tabular-nums">
                  {t.pattern.rowLabel.replace("{n}", String(y + 1))}
                </span>
                {/* 어느 면에서 뜨는 단인지 모르면 안면 지시를 겉면에서
                    뜨게 된다. 원형에서는 전부 겉면이라 군더더기다. */}
                {reading.flat && (
                  <span className="text-text-3 text-caption w-10 shrink-0 pt-0.5">
                    {sideLabel(side)}
                  </span>
                )}
                <span className="min-w-0">
                  {formatRow(opRuns(chart, y, side), proseLocale)}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      {/* 평면 ↔ 원형 — 격자는 그대로고 코수와 양끝 처리가 달라진다(기획 §4) */}
      <section className="mt-6">
        <h2 className="text-micro text-text-3 mb-1">{t.pattern.construction}</h2>
        <p className="text-text-3 text-caption mb-3">
          {t.pattern.constructionHint}
        </p>

        {reading.flat && (
          <>
            <div className="max-w-40">
              <TextField
                label={t.pattern.selvedge}
                inputMode="numeric"
                value={selvedge}
                onChange={(e) =>
                  setSelvedge(Math.max(0, Math.floor(Number(e.target.value) || 0)))
                }
              />
            </div>
            <p className="text-text-3 text-caption -mt-2 mb-3">
              {t.pattern.selvedgeHint}
            </p>
          </>
        )}

        {/* 시작 코수는 여기 있어야 한다. 검산 옆에 두면 "무늬 1회 코수"와
            "이 옷의 코수"가 같은 칸처럼 보인다 — 실제로 그 착각 때문에 12코
            무늬에 146코를 넣으면 검산이 틀린 경고를 냈다. */}
        <div className="max-w-40">
          <TextField
            label={t.pattern.castOn}
            inputMode="numeric"
            value={castOn}
            onChange={(e) => commitCastOn(e.target.value)}
          />
        </div>
        <p className="text-text-3 text-caption -mt-2 mb-3">
          {t.pattern.castOnHint}
        </p>

        {record.castOn === undefined ? (
          <p className="text-text-3 text-small">{t.pattern.needCastOn}</p>
        ) : (
          <ConstructionPlan
            chart={chart}
            castOn={record.castOn}
            flat={reading.flat}
            selvedge={selvedge}
          />
        )}
      </section>

      {/* 범례 — 겉뜨기가 빈 칸이고 심볼에 이름이 없으므로 도안에 반드시 붙는다 */}
      <section className="mt-6">
        <h2 className="text-micro text-text-3 mb-1">{t.pattern.legend}</h2>
        <p className="text-text-3 text-caption mb-2">{t.pattern.legendHint}</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {legend.map((code) => (
            <li
              key={code}
              className="border-line bg-surface flex items-center gap-2 rounded-md border px-3 py-2"
            >
              <span className="border-line shrink-0 rounded-xs border">
                <SymbolSwatch op={code} size={24} />
              </span>
              <span className="text-small min-w-0">
                {stitchLabel(code, locale, "long")}
              </span>
              <span className="text-text-3 text-caption ml-auto shrink-0">
                {t.pattern.countsValue.replace(
                  "{n}",
                  String(counts[code] ?? 0)
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="border-line mt-6 flex items-center gap-2 border-t pt-4">
        <div className="min-w-0 flex-1">
          <TextField
            label={t.pattern.name}
            className="mb-0"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <Button
          variant="secondary"
          onClick={() => navigate({ to: "/patterns" })}
        >
          {t.action.back}
        </Button>
      </div>
    </Page>
  );
}

/** 도메인이 정한 사유를 문장으로 옮긴다 */
function useNoteText() {
  const t = useStrings();
  const map: Record<ConversionNote, string> = {
    everyRowRs: t.pattern.noteEveryRowRs,
    alternatingSides: t.pattern.noteAlternatingSides,
    mustDivide: t.pattern.noteMustDivide,
    addSelvedge: t.pattern.noteAddSelvedge,
    dropSelvedge: t.pattern.noteDropSelvedge,
    seam: t.pattern.noteSeam,
    motifBreaks: t.pattern.noteMotifBreaks,
    jog: t.pattern.noteJog,
  };
  return (note: ConversionNote) => map[note];
}

/**
 * 코수가 무늬에 맞는지, 반대로 뜨면 어떻게 되는지.
 *
 * 무늬 1회 코수는 차트 폭으로 본다 — 격자 하나가 무늬 한 번이라는 것이 기호
 * 도안의 기본 약속이다.
 */
function ConstructionPlan({
  chart,
  castOn,
  flat,
  selvedge,
}: {
  chart: StitchChart;
  castOn: number;
  flat: boolean;
  selvedge: number;
}) {
  const t = useStrings();
  const noteText = useNoteText();
  const here: Construction = flat ? "flat" : "round";
  const there: Construction = flat ? "round" : "flat";

  const now = planConversion({
    from: here,
    to: here,
    repeat: chart.width,
    total: castOn,
    selvedge,
  });
  const switched = equivalentTotal({
    repeats: now.fit.repeats,
    repeat: chart.width,
    to: there,
    selvedge,
  });
  const plan = planConversion({
    from: here,
    to: there,
    repeat: chart.width,
    total: switched,
    selvedge,
  });

  const fill = (template: string) =>
    template
      .replace("{repeat}", String(now.fit.repeat))
      .replace(/\{repeats\}/g, String(now.fit.repeats))
      .replace(/\{remainder\}/g, String(now.fit.remainder))
      .replace("{motif}", String(now.fit.motifStitches))
      .replace("{edges}", String(now.selvedge * 2));

  return (
    <div className="space-y-4">
      {/* 지금 방식에서 맞는가 */}
      <div>
        <p
          className={cn(
            "text-small font-medium",
            now.fit.fits ? "text-finished" : "text-frogged"
          )}
        >
          {fill(
            now.fit.repeats === 0
              ? t.pattern.fitsNone
              : now.fit.fits
                ? t.pattern.fitsExact
                : t.pattern.fitsShort
          )}
        </p>
        {now.selvedge > 0 && (
          <p className="text-text-3 text-caption">
            {fill(t.pattern.fitsWithSelvedge)}
          </p>
        )}
        {/* 안 맞으면 "안 맞아요"로 끝내지 않는다 — 고를 수 있는 값을 준다 */}
        {!now.fit.fits && (
          <p className="text-text-2 text-caption mt-1 flex flex-wrap gap-x-3">
            {now.nearest.down !== null && (
              <span>
                {t.pattern.nearestDown.replace("{n}", String(now.nearest.down))}
              </span>
            )}
            <span>
              {t.pattern.nearestUp.replace("{n}", String(now.nearest.up))}
            </span>
          </p>
        )}
      </div>

      {/* 반대로 뜨면 */}
      <div className="border-line bg-surface rounded-md border p-3">
        <p className="text-small font-medium">
          {t.pattern.switchTo.replace(
            "{mode}",
            there === "flat" ? t.pattern.readingFlat : t.pattern.readingRound
          )}{" "}
          · {t.pattern.switchTotal.replace("{n}", String(switched))}
        </p>
        <ul className="text-text-2 text-caption mt-2 space-y-1">
          {plan.notes.map((note) => (
            <li key={note}>· {noteText(note)}</li>
          ))}
        </ul>
      </div>

      {/* 늘어놓아 보기 — 어디서 끊기는지는 눈으로만 보인다 */}
      <div>
        <h3 className="text-micro text-text-3 mb-1">{t.pattern.tiled}</h3>
        <p className="text-text-3 text-caption mb-2">{t.pattern.tiledHint}</p>
        <div className="border-line overflow-auto rounded-md border p-2">
          <SymbolCanvas
            chart={tileChart(chart, castOn, now.selvedge)}
            cellWidth={TILE_CELL}
            cellHeight={TILE_CELL}
          />
        </div>
      </div>
    </div>
  );
}
