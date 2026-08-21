import { useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Page } from "@/components/ui/page";
import { SelectField, TextField } from "@/components/ui/field";
import { useUnits } from "@/app/units";
import {
  lengthForRows,
  resizeToMyGauge,
  rowsForLength,
  stitchesForWidth,
  suggestNeedle,
  widthForStitches,
  type Gauge,
} from "@/domain/gauge";
import { isImpossible as isCurveImpossible, planCurve } from "@/domain/curve";
import { isImpossible, planEvenShaping } from "@/domain/shaping";
import { CurveDiagram } from "@/features/gauge/components/curve-diagram";
import { ShapingDiagram } from "@/features/gauge/components/shaping-diagram";
import {
  applyEase,
  flatPieceWidth,
  hasMeasurement,
  MEASUREMENT_KEYS,
  type MeasurementKey,
} from "@/domain/body";
import { PieceSchematic } from "@/features/gauge/components/piece-schematic";
import { listGauges, listGaugesForProject } from "@/features/gauge/repository";
import { appendProjectNote, getProject } from "@/features/project/repository";
import { createPiece } from "@/features/piece/repository";
import { listProfiles } from "@/features/profile/repository";
import { useStrings } from "@/i18n";
import { cn } from "@/lib/utils";
import type { BodyProfile } from "@/types/entities";

/**
 * 어느 프로젝트를 위해 계산하는지 URL에 담는다.
 *
 * 게이지 계산은 그냥 하기도 하지만, 대개 **특정 도안이 내 사이즈와 달라서**
 * 한다. 그때 필요한 건 그 프로젝트의 스와치이고, 결과도 그 프로젝트로
 * 돌아가야 한다. search param에 두면 뒤로가기와 새로고침에서도 맥락이 남는다.
 */
const searchSchema = z.object({ projectId: z.string().optional() });

export const Route = createFileRoute("/gauge/calc")({
  component: GaugeCalc,
  validateSearch: searchSchema,
});

const num = (raw: string) => {
  const parsed = Number(raw);
  return raw.trim() === "" || Number.isNaN(parsed) ? undefined : parsed;
};

function GaugeCalc() {
  const t = useStrings();
  const units = useUnits();

  const { projectId } = Route.useSearch();
  const swatches = useLiveQuery(() => listGauges(), []);
  const profiles = useLiveQuery(() => listProfiles(), []);
  const project = useLiveQuery(
    async () => (projectId ? await getProject(projectId) : undefined),
    [projectId]
  );
  const projectSwatches = useLiveQuery(
    async () => (projectId ? await listGaugesForProject(projectId) : []),
    [projectId]
  );

  /* --- 내 게이지 --- */
  // 고른 값이 없으면 이 프로젝트의 스와치를 쓴다. 상태로 밀어넣지 않고
  // 파생값으로 두는 이유는, 데이터가 늦게 도착해도 선택이 튀지 않게 하려는 것.
  const [picked, setPicked] = useState<string>();
  const swatchId = picked ?? projectSwatches?.[0]?.id ?? "";
  const [manualSts, setManualSts] = useState("22");
  const [manualRows, setManualRows] = useState("30");

  const swatch = swatches?.find((s) => s.id === swatchId);
  const myGauge: Gauge = swatch
    ? // 블로킹 후 값이 있으면 그쪽이 완성 치수의 기준이다
      {
        stitchesPer10cm:
          swatch.blockedStitchesPer10cm ?? swatch.stitchesPer10cm,
        rowsPer10cm: swatch.blockedRowsPer10cm ?? swatch.rowsPer10cm,
      }
    : {
        stitchesPer10cm: num(manualSts) ?? 0,
        rowsPer10cm: num(manualRows) ?? 0,
      };

  const gaugeReady = myGauge.stitchesPer10cm > 0 && myGauge.rowsPer10cm > 0;

  return (
    <Page title={t.gauge.calcTitle}>
      <Link
        to="/gauge"
        className="text-text-2 text-small -mt-2 mb-4 inline-flex items-center gap-1"
      >
        <ChevronLeft size={16} />
        {t.gauge.title}
      </Link>

      {/* 어느 프로젝트를 위한 계산인지 늘 보이게 둔다. 계산기에 들어오면
          입력값에 정신이 팔려서 "무엇 때문에 계산하던 건지"를 놓친다. */}
      {project && (
        <div className="border-line bg-sunken mb-5 flex items-center justify-between gap-3 rounded-md border p-3">
          <p className="text-small min-w-0 truncate">
            {t.calc.forProject.replace("{name}", project.name)}
          </p>
          <Link
            to="/projects/$projectId"
            params={{ projectId: project.id }}
            className="text-text-2 text-caption hover:text-text shrink-0 underline"
          >
            {t.calc.backToProject}
          </Link>
        </div>
      )}

      {/* 내 게이지 — 아래 계산 전부의 입력 */}
      <Section title={t.calc.myGauge}>
        {/* 스와치가 없으면 아래 숫자는 내 게이지가 아니라 남의 값이다.
            계산은 되지만 그 결과로 뜨면 크기가 안 맞으므로 그렇다고 말한다. */}
        {swatches && swatches.length === 0 && (
          <p className="text-text-2 text-small mb-3">
            {t.calc.noSwatch}{" "}
            <Link to="/gauge/new" className="underline">
              {t.swatch.start}
            </Link>
          </p>
        )}

        {swatches && swatches.length > 0 && (
          <SelectField
            label={t.calc.pickGauge}
            value={swatchId}
            onChange={(e) => setPicked(e.target.value)}
            options={[
              { value: "", label: t.calc.manual },
              ...swatches.map((s) => ({
                value: s.id,
                label:
                  s.label ??
                  t.gauge.summary
                    .replace("{sts}", String(s.stitchesPer10cm))
                    .replace("{rows}", String(s.rowsPer10cm)),
              })),
            ]}
          />
        )}

        {swatch ? (
          <p className="text-text-2 text-small">
            {t.gauge.summary
              .replace("{sts}", String(myGauge.stitchesPer10cm))
              .replace("{rows}", String(myGauge.rowsPer10cm))}
          </p>
        ) : (
          <div className="flex gap-3">
            <div className="flex-1">
              <TextField
                label={t.gauge.stitches}
                className="mb-0"
                inputMode="decimal"
                value={manualSts}
                onChange={(e) => setManualSts(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <TextField
                label={t.gauge.rows}
                className="mb-0"
                inputMode="decimal"
                value={manualRows}
                onChange={(e) => setManualRows(e.target.value)}
              />
            </div>
          </div>
        )}
      </Section>

      {gaugeReady && (
        <>
          <SizeToStitches
            gauge={myGauge}
            profiles={profiles ?? []}
            projectId={projectId}
            gaugeId={swatch?.id}
          />
          <ResizePattern gauge={myGauge} projectId={projectId} />
          <NeedleAdvice gauge={myGauge} />
        </>
      )}

      {!gaugeReady && (
        <p className="text-text-3 text-small">{t.gauge.emptyHint}</p>
      )}

      {/* 균등 증감은 게이지를 쓰지 않는다 — 코수만으로 계산된다. 그래서
          스와치를 아직 안 뜬 사람도 쓸 수 있게 게이지 조건 밖에 둔다. */}
      <EvenShaping />

      <NeckAndArmhole />

      <p className="text-text-3 text-caption mt-6">
        {units.lengthLabel === "in" ? "게이지는 10cm 기준으로 입력해요." : ""}
      </p>
    </Page>
  );
}

/* --- 치수 → 코수 ---------------------------------------------------------- */

function SizeToStitches({
  gauge,
  profiles,
  projectId,
  gaugeId,
}: {
  gauge: Gauge;
  profiles: BodyProfile[];
  /** 프로젝트에서 들어왔으면 결과를 조각으로 남길 수 있다 */
  projectId?: string;
  gaugeId?: string;
}) {
  const t = useStrings();
  const units = useUnits();

  const [profileId, setProfileId] = useState("");
  const [pieceName, setPieceName] = useState("");
  const [savedPiece, setSavedPiece] = useState(false);
  const [measureKey, setMeasureKey] = useState<MeasurementKey>("bust");
  const [width, setWidth] = useState("50");
  const [length, setLength] = useState("60");

  const profile = profiles.find((p) => p.id === profileId);
  const actualCm = profile?.measurements[measureKey];
  const easeCm = profile?.preferredEaseCm ?? 0;

  // 프로필을 고르면 실측+여유가 너비 입력을 대신한다
  let finishedCm: number | undefined;
  let pieceCm: number | undefined;
  if (actualCm !== undefined && actualCm > 0) {
    try {
      finishedCm = applyEase(actualCm, easeCm);
      pieceCm = flatPieceWidth(finishedCm);
    } catch {
      // 여유분이 과하게 음수라 완성 치수가 0 이하가 된 경우.
      // 계산기를 멈추지 않고 그 항목만 비운다.
      finishedCm = undefined;
    }
  }

  const widthCm = pieceCm ?? units.toCm(num(width) ?? 0);
  const lengthCm = units.toCm(num(length) ?? 0);

  const availableKeys = profile
    ? MEASUREMENT_KEYS.filter((k) => hasMeasurement(profile.measurements, k))
    : [];

  return (
    <Section title={t.calc.toStitches}>
      {profiles.length > 0 && (
        <>
          <SelectField
            label={t.calc.fromProfile}
            value={profileId}
            onChange={(e) => setProfileId(e.target.value)}
            options={[
              { value: "", label: t.calc.manual },
              ...profiles.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
          {profile && availableKeys.length > 0 && (
            <SelectField
              label={t.profile.title}
              value={measureKey}
              onChange={(e) => setMeasureKey(e.target.value as MeasurementKey)}
              options={availableKeys.map((k) => ({
                value: k,
                label: `${t.profile.measure[k]} ${units.formatLength(
                  profile.measurements[k]!,
                  0
                )}`,
              }))}
            />
          )}
        </>
      )}

      {/* 소수점을 버리지 않는다. 둘레 101cm의 절반은 50.5cm인데 51cm로
          반올림해 보여주면 아래 코수(50.5 기준)와 어긋나 보인다.
          계산기는 자기가 쓴 값을 그대로 보여줘야 신뢰를 잃지 않는다. */}
      {finishedCm !== undefined ? (
        <div className="bg-sunken mb-4 rounded-md p-3">
          <p className="text-small">
            {t.calc.finished.replace("{n}", units.formatLength(finishedCm, 1))}
          </p>
          <p className="text-text-2 text-small">
            {t.calc.flatPiece.replace("{n}", units.formatLength(pieceCm!, 1))}
          </p>
        </div>
      ) : (
        <TextField
          label={`${t.calc.width} (${units.lengthLabel})`}
          inputMode="decimal"
          value={width}
          onChange={(e) => setWidth(e.target.value)}
        />
      )}

      <TextField
        label={`${t.calc.length} (${units.lengthLabel})`}
        inputMode="decimal"
        value={length}
        onChange={(e) => setLength(e.target.value)}
      />

      {/* 숫자와 도형을 같은 카드에 둔다. 코수만 보면 그게 어떤 조각인지
          가늠할 수 없고, 도형만 보면 뜰 수가 없다. */}
      <Result>
        {widthCm > 0 && (
          <strong className="text-title font-semibold">
            {t.calc.resultStitches.replace(
              "{n}",
              String(stitchesForWidth(gauge, widthCm))
            )}
          </strong>
        )}
        {lengthCm > 0 && (
          <span className="text-text-2">
            {t.calc.resultRows.replace(
              "{n}",
              String(rowsForLength(gauge, lengthCm))
            )}
          </span>
        )}
        {widthCm > 0 && lengthCm > 0 && (
          <div className="border-line mt-3 border-t pt-3">
            <PieceSchematic
              widthCm={widthCm}
              lengthCm={lengthCm}
              stitches={stitchesForWidth(gauge, widthCm)}
              rows={rowsForLength(gauge, lengthCm)}
            />
            <p className="text-text-3 text-caption mt-2 text-left">
              {t.calc.gridHint}
            </p>
          </div>
        )}

        {/* 계산해놓고 잊는 게 이 계산의 가장 흔한 결말이다. 조각으로 남기면
            배색 도안의 얹을 코수와 게이지 어긋남 감시가 이 숫자를 이어받는다.
            치수(cm)까지 함께 저장된다 — 그게 뜻이고 코수는 답이다. */}
        {projectId && widthCm > 0 && (
          <div className="border-line mt-3 flex gap-2 border-t pt-3">
            <div className="flex-1">
              <TextField
                label={t.piece.name}
                className="mb-0"
                placeholder={t.piece.namePlaceholder}
                value={pieceName}
                onChange={(e) => {
                  setPieceName(e.target.value);
                  setSavedPiece(false);
                }}
              />
            </div>
            <Button
              variant="secondary"
              className="self-end"
              disabled={savedPiece || pieceName.trim() === ""}
              onClick={() => {
                void createPiece(projectId, {
                  name: pieceName.trim(),
                  widthCm: Math.round(widthCm * 10) / 10,
                  lengthCm:
                    lengthCm > 0 ? Math.round(lengthCm * 10) / 10 : undefined,
                  stitches: stitchesForWidth(gauge, widthCm),
                  rows:
                    lengthCm > 0 ? rowsForLength(gauge, lengthCm) : undefined,
                  gaugeId,
                });
                setSavedPiece(true);
              }}
            >
              {savedPiece ? t.piece.savedAsPiece : t.piece.saveAsPiece}
            </Button>
          </div>
        )}
      </Result>
    </Section>
  );
}

/* --- 도안 리사이징 -------------------------------------------------------- */

function ResizePattern({
  gauge,
  projectId,
}: {
  gauge: Gauge;
  /** 프로젝트에서 들어왔으면 결과를 그 프로젝트 메모에 남길 수 있다 */
  projectId?: string;
}) {
  const t = useStrings();
  const units = useUnits();
  const [saved, setSaved] = useState(false);

  const [patternSts, setPatternSts] = useState("22");
  const [patternRows, setPatternRows] = useState("30");
  const [castOn, setCastOn] = useState("110");
  const [totalRows, setTotalRows] = useState("180");
  const [repeat, setRepeat] = useState("");
  const [offset, setOffset] = useState("");

  const patternGauge: Gauge = {
    stitchesPer10cm: num(patternSts) ?? 0,
    rowsPer10cm: num(patternRows) ?? 0,
  };
  const ready =
    patternGauge.stitchesPer10cm > 0 &&
    patternGauge.rowsPer10cm > 0 &&
    (num(castOn) ?? 0) > 0;

  const result = ready
    ? resizeToMyGauge(num(castOn) ?? 0, num(totalRows) ?? 0, {
        patternGauge,
        myGauge: gauge,
        repeat: num(repeat),
        repeatOffset: num(offset),
      })
    : null;

  return (
    <Section title={t.calc.resize} hint={t.calc.resizeHint}>
      <div className="flex gap-3">
        <div className="flex-1">
          <TextField
            label={`${t.calc.patternGauge} · ${t.gauge.stitches}`}
            inputMode="decimal"
            value={patternSts}
            onChange={(e) => setPatternSts(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <TextField
            label={t.gauge.rows}
            inputMode="decimal"
            value={patternRows}
            onChange={(e) => setPatternRows(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <TextField
            label={t.calc.patternStitches}
            inputMode="numeric"
            value={castOn}
            onChange={(e) => setCastOn(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <TextField
            label={t.calc.patternRows}
            inputMode="numeric"
            value={totalRows}
            onChange={(e) => setTotalRows(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <TextField
            label={t.calc.repeat}
            inputMode="numeric"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <TextField
            label={t.calc.repeatOffset}
            inputMode="numeric"
            value={offset}
            onChange={(e) => setOffset(e.target.value)}
          />
        </div>
      </div>

      {result && (
        <Result>
          <strong className="text-title font-semibold">
            {t.calc.resized
              .replace("{sts}", String(result.stitches))
              .replace("{rows}", String(result.rows))}
          </strong>

          {/* 계산해놓고 잊는 게 이 계산의 가장 흔한 결말이다. 프로젝트에서
              들어왔으면 결과를 그 프로젝트 메모에 남길 수 있게 한다. */}
          {projectId && (
            <Button
              variant="secondary"
              disabled={saved}
              onClick={() => {
                void appendProjectNote(
                  projectId,
                  t.calc.savedNote
                    .replace("{sts}", String(result.stitches))
                    .replace("{rows}", String(result.rows))
                    .replace("{gaugeSts}", String(gauge.stitchesPer10cm))
                    .replace("{gaugeRows}", String(gauge.rowsPer10cm))
                );
                setSaved(true);
              }}
            >
              {saved ? t.calc.saveDone : t.calc.saveToProject}
            </Button>
          )}

          {/* 리사이징은 "완성 치수를 유지한다"가 원리다. 두 도식을 겹쳐
              그리면 같은 사각형이 겹칠 뿐이라, 위아래로 나란히 두고
              격자 밀도가 달라지는 것을 보여준다 — 바뀌는 건 크기가
              아니라 코수라는 게 이 그림의 요점이다. */}
          <div className="border-line mt-3 space-y-4 border-t pt-3">
            <PieceSchematic
              caption={t.calc.patternGauge}
              widthCm={widthForStitches(patternGauge, num(castOn) ?? 0)}
              lengthCm={lengthForRows(patternGauge, num(totalRows) ?? 0)}
              stitches={num(castOn) ?? 0}
              rows={num(totalRows) ?? 0}
            />
            <PieceSchematic
              caption={t.calc.myGauge}
              widthCm={widthForStitches(gauge, result.stitches)}
              lengthCm={lengthForRows(gauge, result.rows)}
              stitches={result.stitches}
              rows={result.rows}
            />
          </div>
          {/* 배수 보정으로 생긴 오차를 숨기지 않는다. 무늬를 지키느라
              완성 치수가 조금 달라졌다는 사실을 알아야 판단할 수 있다. */}
          {Math.abs(result.widthDeltaCm) >= 0.5 && (
            <span className="text-hibernating">
              {t.calc.deltaWarn.replace(
                "{n}",
                units.formatLength(result.widthDeltaCm, 1)
              )}
            </span>
          )}
        </Result>
      )}
    </Section>
  );
}

/* --- 바늘 조정 ------------------------------------------------------------ */

function NeedleAdvice({ gauge }: { gauge: Gauge }) {
  const t = useStrings();
  const [targetSts, setTargetSts] = useState("22");
  const [needleMm, setNeedleMm] = useState("4");

  const target: Gauge = {
    stitchesPer10cm: num(targetSts) ?? 0,
    rowsPer10cm: gauge.rowsPer10cm,
  };
  const current = num(needleMm) ?? 0;
  const advice =
    target.stitchesPer10cm > 0 && current > 0
      ? suggestNeedle(gauge, target, current)
      : null;

  return (
    <Section title={t.calc.needleSuggest}>
      <div className="flex gap-3">
        <div className="flex-1">
          <TextField
            label={`${t.calc.targetGauge} · ${t.gauge.stitches}`}
            inputMode="decimal"
            value={targetSts}
            onChange={(e) => setTargetSts(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <TextField
            label={t.calc.currentNeedle}
            inputMode="decimal"
            value={needleMm}
            onChange={(e) => setNeedleMm(e.target.value)}
          />
        </div>
      </div>

      {advice && (
        <Result>
          <strong className="text-subhead font-semibold">
            {advice.direction === "none"
              ? t.calc.needleOk
              : (advice.direction === "up"
                  ? t.calc.goUp
                  : t.calc.goDown
                ).replace("{mm}", String(advice.suggestedMm))}
          </strong>
        </Result>
      )}
    </Section>
  );
}

/* --- 균등 증감 ------------------------------------------------------------ */

/**
 * 균등 증감.
 *
 * 도안이 가장 자주 요구하는 계산이고("88코를 120코로 균등하게 늘리기") 손으로
 * 하기 가장 귀찮다. 계산 자체는 domain/shaping.ts에 있고 여기서는 입력을 받아
 * 도안 문장처럼 읽어준다.
 */
function EvenShaping() {
  const t = useStrings();

  const [from, setFrom] = useState("88");
  const [to, setTo] = useState("120");
  const [inRound, setInRound] = useState(false);
  const [edge, setEdge] = useState("1");

  const fromCount = num(from) ?? 0;
  const toCount = num(to) ?? 0;
  const ready = fromCount > 0 && toCount > 0;

  const result = ready
    ? planEvenShaping({
        from: Math.round(fromCount),
        to: Math.round(toCount),
        inRound,
        edgeStitches: Math.round(num(edge) ?? 0),
      })
    : null;

  return (
    <Section title={t.shaping.title} hint={t.shaping.hint}>
      <div className="flex gap-3">
        <div className="flex-1">
          <TextField
            label={t.shaping.from}
            inputMode="numeric"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <TextField
            label={t.shaping.to}
            inputMode="numeric"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>

      {/* 원형이냐 평면이냐가 배치를 바꾼다. 평면은 끝에 평코가 남아야 하므로
          구간이 하나 더 필요하다 — 이건 취향이 아니라 계산의 입력이다. */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex gap-1.5">
          {[false, true].map((round) => (
            <button
              key={String(round)}
              type="button"
              aria-pressed={inRound === round}
              onClick={() => setInRound(round)}
              className={cn(
                "text-caption min-h-11 rounded-sm px-3 transition",
                inRound === round
                  ? "bg-accent text-on-accent font-semibold"
                  : "bg-sunken text-text-2"
              )}
            >
              {round ? t.shaping.inRound : t.shaping.flat}
            </button>
          ))}
        </div>

        {!inRound && (
          <div className="w-32">
            <TextField
              label={t.shaping.edge}
              className="mb-0"
              inputMode="numeric"
              value={edge}
              onChange={(e) => setEdge(e.target.value)}
            />
          </div>
        )}
      </div>

      {result && isImpossible(result) && (
        <Result>
          <strong className="text-subhead text-frogged font-semibold">
            {t.shaping.impossible
              .replace("{from}", String(result.available))
              .replace("{n}", String(result.changes))
              .replace("{needed}", String(result.needed))}
          </strong>
        </Result>
      )}

      {result && !isImpossible(result) && (
        <Result>
          {result.changes === 0 ? (
            <span className="text-text-2">{t.shaping.nothing}</span>
          ) : (
            <>
              <strong className="text-title font-semibold">
                {(result.kind === "increase"
                  ? t.shaping.increaseCount
                  : t.shaping.decreaseCount
                ).replace("{n}", String(result.changes))}
              </strong>

              {/* 도안이 적는 방식으로 읽어준다. 이 문장을 그대로 보고 뜰 수
                  있어야 계산기가 일을 한 것이다. */}
              <p className="text-small">
                {[
                  result.edgeStitches > 0
                    ? t.shaping.edgeNote.replace(
                        "{n}",
                        String(result.edgeStitches)
                      )
                    : null,
                  ...result.runs.map((run) =>
                    t.shaping.step
                      .replace("{plain}", String(run.plain))
                      .replace(
                        "{action}",
                        result.kind === "increase"
                          ? t.shaping.increase
                          : t.shaping.decrease
                      )
                      .replace("{times}", String(run.times))
                  ),
                  result.tail > 0
                    ? t.shaping.tail.replace("{n}", String(result.tail))
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>

              <ShapingDiagram plan={result} />

              {/* 검산은 숨기지 않는다. 계산기를 믿고 뜬 사람이 몇 시간을 잃는
                  종류의 실수라, 결과 코수를 되짚어 함께 보여준다. */}
              <p className="text-text-2 text-small">
                {t.shaping.result.replace("{n}", String(result.resulting))}
                {result.even && ` · ${t.shaping.even}`}
              </p>
            </>
          )}
        </Result>
      )}
    </Section>
  );
}

/* --- 목선 · 암홀 곡선 ------------------------------------------------------ */

/**
 * 코막음 배분.
 *
 * 진동과 목둘레는 한 번에 막지 않는다. 여러 단에 걸쳐 큰 것부터 줄여야 곡선이
 * 되고, 도안은 그 배분을 코수-단수-횟수로 적는다. 계산은 domain/curve.ts에 있고
 * 여기서는 도안 표기와 읽는 문장을 나란히 보여준다 — 표기는 옮겨 적기 위한
 * 것이고 문장은 지금 이해하기 위한 것이다.
 */
function NeckAndArmhole() {
  const t = useStrings();

  const [stitches, setStitches] = useState("13");
  const [rows, setRows] = useState("14");
  const [firstBindOff, setFirstBindOff] = useState("4");
  const [everyOtherRow, setEveryOtherRow] = useState(true);

  const result = planCurve({
    stitches: num(stitches) ?? 0,
    rows: num(rows) ?? 0,
    firstBindOff: num(firstBindOff) ?? 0,
    everyOtherRow,
  });

  return (
    <Section title={t.curve.title} hint={t.curve.hint}>
      <div className="flex gap-3">
        <div className="flex-1">
          <TextField
            label={t.curve.stitches}
            inputMode="numeric"
            value={stitches}
            onChange={(e) => setStitches(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <TextField
            label={t.curve.rows}
            inputMode="numeric"
            value={rows}
            onChange={(e) => setRows(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-32">
          <TextField
            label={t.curve.firstBindOff}
            className="mb-0"
            inputMode="numeric"
            value={firstBindOff}
            onChange={(e) => setFirstBindOff(e.target.value)}
          />
        </div>
        {/* 평면에서 겉면에서만 줄이면 두 단마다가 된다. 목선은 매 단 줄이는
            경우도 있어서 고를 수 있게 둔다. */}
        <div className="mb-4 flex gap-1.5">
          {[false, true].map((other) => (
            <button
              key={String(other)}
              type="button"
              aria-pressed={everyOtherRow === other}
              onClick={() => setEveryOtherRow(other)}
              className={cn(
                "text-caption min-h-11 rounded-sm px-3 transition",
                everyOtherRow === other
                  ? "bg-accent text-on-accent font-semibold"
                  : "bg-sunken text-text-2"
              )}
            >
              {other ? t.curve.everyOtherRow : t.curve.everyRow}
            </button>
          ))}
        </div>
      </div>
      <p className="text-text-3 text-caption mb-4">
        {t.curve.firstBindOffHint}
      </p>

      {isCurveImpossible(result) ? (
        <Result>
          <strong className="text-subhead text-frogged font-semibold">
            {t.curve.impossible.replace("{n}", String(result.neededRows))}
          </strong>
        </Result>
      ) : result.steps.length === 0 ? (
        <Result>
          <span className="text-text-2">{t.curve.nothing}</span>
        </Result>
      ) : (
        <Result>
          {/* 도안 표기가 주인공이다 — 이걸 종이에 옮겨 적고 뜬다 */}
          <strong className="text-title font-semibold">
            {result.steps
              .map((s) => `${s.stitches}-${s.rowInterval}-${s.times}`)
              .join(" · ")}
          </strong>
          <span className="text-text-3 text-caption">
            {t.curve.notationLegend}
          </span>

          <p className="text-small mt-1">
            {result.steps
              .map((s, i) =>
                i === 0 && s.rowInterval === 1 && s.times === 1
                  ? t.curve.stepFirst.replace("{stitches}", String(s.stitches))
                  : t.curve.step
                      .replace("{stitches}", String(s.stitches))
                      .replace("{interval}", String(s.rowInterval))
                      .replace("{times}", String(s.times))
              )
              .join(" · ")}
          </p>

          <CurveDiagram plan={result} />

          <p className="text-text-2 text-small">
            {t.curve.result
              .replace("{stitches}", String(result.stitchesUsed))
              .replace("{rows}", String(result.rowsUsed))}
            {result.plainRows > 0 &&
              ` · ${t.curve.plainRows.replace("{n}", String(result.plainRows))}`}
          </p>

          {/* 막을 수는 있지만 곡선이 계단이 되는 구간을 알린다 */}
          {result.maxPerStep >= 4 && (
            <p className="text-hibernating text-caption">
              {t.curve.steep.replace("{n}", String(result.maxPerStep))}
            </p>
          )}
        </Result>
      )}
    </Section>
  );
}

/* --- 공통 ----------------------------------------------------------------- */

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-line mb-6 border-t pt-5">
      <h2 className="mb-1 font-medium">{title}</h2>
      {hint && <p className="text-text-3 text-caption mb-3">{hint}</p>}
      {!hint && <div className="mb-3" />}
      {children}
    </section>
  );
}

function Result({ children }: { children: ReactNode }) {
  return (
    <div className="border-line flex flex-col gap-1 rounded-md border p-4 text-center">
      {children}
    </div>
  );
}
