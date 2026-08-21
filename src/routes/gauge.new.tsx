import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import { Page } from "@/components/ui/page";
import { SegmentedControl } from "@/components/ui/segmented";
import { GaugeForm } from "@/features/gauge/components/gauge-form";
import { PhotoMeasure } from "@/features/gauge/components/photo-measure";
import { StitchCountDiagram } from "@/features/gauge/components/stitch-count-diagram";
import { createGauge } from "@/features/gauge/repository";
import { listYarns } from "@/features/yarn/repository";
import { gaugeLooksOff, per10cm, swatchAdvice } from "@/domain/swatch";
import {
  guessWeightFromLabel,
  YARN_WEIGHTS,
  type YarnWeightClass,
} from "@/domain/units";
import { z } from "zod";
import { useStrings } from "@/i18n";
import type { GaugeFormValues } from "@/features/gauge/repository";

/**
 * 실을 미리 골라 들어올 수 있다.
 *
 * 실 상세가 "권장 바늘 3.75~4.5mm"까지 알려주고 끝나면 다음 걸음이 없다.
 * 거기서 바로 들어오면 굵기를 다시 고르지 않아도 된다 — 그 실을 이미 아는데
 * 또 묻는 건 원칙 5가 말하는 "데려가는 길"이 아니다.
 */
const searchSchema = z.object({ yarnId: z.string().optional() });

export const Route = createFileRoute("/gauge/new")({
  component: NewGauge,
  validateSearch: searchSchema,
});

/**
 * 스와치 안내 — 게이지를 **모르는 사람**의 입구.
 *
 * 예전 이 화면은 "10cm당 코수"를 묻는 폼 하나였다. 그건 이미 스와치를 뜨고
 * 코를 세어본 사람의 답이라서, 처음 뜨는 사람은 첫 칸에서 막혔다. 앱 전체가
 * 게이지에 걸려 있으므로(계산기 여섯, 완성 모양, 치수 계산) 그 막힘은
 * 앱 전체의 막힘이었다.
 *
 * 그래서 순서를 뒤집었다 — **묻기 전에 알려준다.** 실을 고르면 바늘과 잡을
 * 코수와 크기가 나오고, 다 뜨면 무엇을 세는지 그림으로 보여주고, 그다음에야
 * 숫자를 받는다.
 *
 * 아는 사람을 붙잡아두지 않는다. "숫자를 이미 알아요"가 폼으로 바로 보낸다 —
 * 안내를 강제하면 두 번째부터는 방해가 된다.
 */
type Step = "yarn" | "measure" | "confirm";

function NewGauge() {
  const t = useStrings();
  const navigate = useNavigate();
  const yarns = useLiveQuery(() => listYarns(), []);
  const { yarnId: fromLink } = Route.useSearch();

  const [step, setStep] = useState<Step>("yarn");
  const [yarnId, setYarnId] = useState(fromLink ?? "");
  const [manualWeight, setManualWeight] = useState<YarnWeightClass | "">("");
  const [measured, setMeasured] = useState<{
    stitchesPer10cm: number;
    rowsPer10cm: number;
  }>();

  const yarn = yarns?.find((y) => y.id === yarnId);
  // 라벨의 그램·미터에서 굵기를 되짚는다. 사용자는 자기 실이 몇 번인지 모른다.
  const fromYarn =
    yarn?.weightClass ??
    guessWeightFromLabel(yarn?.skeinGrams, yarn?.skeinMeters)?.cyc;
  const weight: YarnWeightClass | undefined =
    manualWeight === "" ? fromYarn : manualWeight;

  const initial: GaugeFormValues | undefined = measured
    ? { ...measured, yarnId: yarnId || undefined, needleMm: undefined }
    : undefined;

  async function save(values: GaugeFormValues) {
    await createGauge(values);
    await navigate({ to: "/gauge" });
  }

  return (
    <Page title={step === "confirm" ? t.gauge.add : t.swatch.title}>
      {/* 아는 사람은 여기서 바로 빠져나간다 */}
      {step !== "confirm" && (
        <button
          type="button"
          className="text-text-2 text-small hover:text-text -mt-2 mb-5 underline"
          onClick={() => setStep("confirm")}
        >
          {t.swatch.knowAlready}
        </button>
      )}

      {step === "yarn" && (
        <YarnStep
          yarns={yarns}
          yarnId={yarnId}
          onYarn={setYarnId}
          manualWeight={manualWeight}
          onManualWeight={setManualWeight}
          weight={weight}
          unknown={Boolean(yarn) && fromYarn === undefined}
          onNext={() => setStep("measure")}
        />
      )}

      {step === "measure" && (
        <MeasureStep
          onBack={() => setStep("yarn")}
          onDone={(gauge) => {
            setMeasured(gauge);
            setStep("confirm");
          }}
        />
      )}

      {step === "confirm" && (
        <>
          {/* 조용히 틀리는 것을 막는다. 거부하지 않고 물어본다 —
              굵은 바늘로 일부러 느슨하게 뜨는 것도 실제로 하는 일이다. */}
          {measured &&
            weight !== undefined &&
            gaugeLooksOff(measured.stitchesPer10cm, weight) && (
              <p className="text-hibernating border-hibernating/40 text-small mb-5 rounded-md border border-dashed p-3">
                {t.swatch.looksOff}
              </p>
            )}
          <GaugeForm
            initial={initial}
            submitLabel={t.action.create}
            onCancel={() => navigate({ to: "/gauge" })}
            onSubmit={save}
          />
        </>
      )}
    </Page>
  );
}

/* --- 1. 실에서 출발점을 낸다 --------------------------------------------- */

function YarnStep({
  yarns,
  yarnId,
  onYarn,
  manualWeight,
  onManualWeight,
  weight,
  unknown,
  onNext,
}: {
  yarns: { id: string; name: string }[] | undefined;
  yarnId: string;
  onYarn: (id: string) => void;
  manualWeight: YarnWeightClass | "";
  onManualWeight: (w: YarnWeightClass | "") => void;
  weight: YarnWeightClass | undefined;
  unknown: boolean;
  onNext: () => void;
}) {
  const t = useStrings();
  const advice = weight === undefined ? undefined : swatchAdvice(weight);

  return (
    <>
      <section className="border-line bg-sunken mb-6 rounded-md border p-4">
        <h2 className="text-small mb-1.5 font-medium">{t.swatch.why}</h2>
        <p className="text-text-2 text-small">{t.swatch.whyBody}</p>
        <p className="text-text-3 text-caption mt-2">{t.swatch.whyCost}</p>
      </section>

      <h2 className="mb-3 font-medium">{t.swatch.step1}</h2>

      {yarns && yarns.length > 0 ? (
        <SelectField
          label={t.swatch.pickYarn}
          value={yarnId}
          onChange={(e) => onYarn(e.target.value)}
          options={[
            { value: "", label: t.swatch.manualWeight },
            ...yarns.map((y) => ({ value: y.id, label: y.name })),
          ]}
        />
      ) : (
        <p className="text-text-3 text-caption mb-4">{t.swatch.noStash}</p>
      )}

      {/* 스태시에 없거나 라벨로 못 알아낸 실 — 굵기를 직접 고른다 */}
      {(!yarnId || unknown) && (
        <>
          {unknown && (
            <p className="text-text-2 text-small mb-2">
              {t.swatch.unknownWeight}
            </p>
          )}
          <SelectField
            label={t.yarn.weightClass}
            value={manualWeight === "" ? "" : String(manualWeight)}
            onChange={(e) =>
              onManualWeight(
                e.target.value === ""
                  ? ""
                  : (Number(e.target.value) as YarnWeightClass)
              )
            }
            options={[
              { value: "", label: t.yarn.weightUnset },
              ...YARN_WEIGHTS.map((w) => ({
                value: String(w.cyc),
                label: w.names.ko,
              })),
            ]}
          />
        </>
      )}

      {advice && (
        <section className="border-line mb-6 rounded-md border p-4">
          <h3 className="text-micro text-text-3 mb-2">
            {t.swatch.adviceTitle}
          </h3>
          <ul className="text-subhead space-y-1 font-semibold">
            <li>
              {t.swatch.adviceCastOn.replace("{n}", String(advice.castOn))}
            </li>
            <li>
              {t.swatch.adviceNeedle
                .replace("{min}", String(advice.needleMm[0]))
                .replace("{max}", String(advice.needleMm[1]))}
            </li>
            <li>{t.swatch.adviceSize.replace("{n}", String(advice.sizeCm))}</li>
          </ul>
          <p className="text-text-2 text-small mt-3">{t.swatch.adviceStitch}</p>
          <p className="text-text-3 text-caption mt-2">{t.swatch.whySize}</p>
          <p className="text-text-3 text-caption mt-1.5">
            {t.swatch.whyCastOn
              .replace("{min}", String(advice.expected[0]))
              .replace("{max}", String(advice.expected[1]))}
          </p>
        </section>
      )}

      <Button block onClick={onNext}>
        {t.swatch.next}
      </Button>
    </>
  );
}

/* --- 2. 무엇을 세는지 보여주고 받는다 ------------------------------------- */

type How = "hand" | "photo";

function MeasureStep({
  onBack,
  onDone,
}: {
  onBack: () => void;
  onDone: (gauge: { stitchesPer10cm: number; rowsPer10cm: number }) => void;
}) {
  const t = useStrings();
  const [how, setHow] = useState<How>("hand");

  const [sts, setSts] = useState("20");
  const [stsCm, setStsCm] = useState("");
  const [rows, setRows] = useState("20");
  const [rowsCm, setRowsCm] = useState("");

  const num = (raw: string) => {
    const n = Number(raw);
    return raw.trim() === "" || Number.isNaN(n) ? undefined : n;
  };

  const stitchesPer10cm = per10cm(num(sts) ?? 0, num(stsCm) ?? 0);
  const rowsPer10cm = per10cm(num(rows) ?? 0, num(rowsCm) ?? 0);
  const ready = stitchesPer10cm !== null && rowsPer10cm !== null;

  return (
    <>
      <h2 className="mb-1 font-medium">{t.swatch.step2}</h2>
      <p className="text-text-2 text-small mb-4">{t.swatch.whatToCount}</p>

      <div className="border-line bg-sunken mb-3 rounded-md border p-4">
        <StitchCountDiagram />
      </div>
      <p className="text-text-2 text-small mb-1">{t.swatch.countHow}</p>
      <p className="text-text-3 text-caption mb-6">{t.swatch.countTip}</p>

      <SegmentedControl
        label={t.swatch.how}
        value={how}
        onChange={setHow}
        options={[
          { value: "hand", label: t.swatch.byHand },
          { value: "photo", label: t.swatch.byPhoto },
        ]}
      />

      {how === "photo" ? (
        <div className="border-line mb-6 rounded-md border p-3">
          <PhotoMeasure onApply={onDone} />
        </div>
      ) : (
        <>
          <div className="flex gap-3">
            <div className="flex-1">
              <TextField
                label={t.swatch.spanStitches}
                inputMode="numeric"
                value={sts}
                onChange={(e) => setSts(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <TextField
                label={t.swatch.spanWidthCm}
                inputMode="decimal"
                value={stsCm}
                onChange={(e) => setStsCm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <TextField
                label={t.swatch.spanRows}
                inputMode="numeric"
                value={rows}
                onChange={(e) => setRows(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <TextField
                label={t.swatch.spanHeightCm}
                inputMode="decimal"
                value={rowsCm}
                onChange={(e) => setRowsCm(e.target.value)}
              />
            </div>
          </div>
          <p className="text-text-3 text-caption -mt-2 mb-4">
            {t.swatch.spanHint}
          </p>

          <p className="border-line text-subhead mb-5 rounded-md border p-4 text-center font-semibold">
            {ready
              ? t.swatch.computed
                  .replace("{sts}", String(stitchesPer10cm))
                  .replace("{rows}", String(rowsPer10cm))
              : t.swatch.needSpan}
          </p>
        </>
      )}

      <div className="flex gap-2">
        {how === "hand" && (
          <Button
            block
            disabled={!ready}
            onClick={() =>
              ready &&
              onDone({
                stitchesPer10cm: stitchesPer10cm!,
                rowsPer10cm: rowsPer10cm!,
              })
            }
          >
            {t.swatch.next}
          </Button>
        )}
        <Button variant="secondary" onClick={onBack}>
          {t.swatch.prev}
        </Button>
      </div>
    </>
  );
}
