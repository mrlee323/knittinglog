import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import {
  guessWeightFromLabel,
  YARN_WEIGHTS,
  type YarnWeight,
  type YarnWeightClass,
} from "@/domain/units";
import {
  yarnFormSchema,
  type YarnFormValues,
} from "@/features/yarn/repository";
import { useLocale, useStrings } from "@/i18n";

const EMPTY: YarnFormValues = { name: "", skeinCount: 1 };

/** 빈 칸은 undefined로. 0과 "입력 안 함"은 다르다. */
const num = (raw: string) => (raw.trim() === "" ? undefined : Number(raw));
const str = (raw: string) => (raw.trim() === "" ? undefined : raw);

export function YarnForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: YarnFormValues;
  submitLabel: string;
  onSubmit: (values: YarnFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useStrings();
  const locale = useLocale();
  const [values, setValues] = useState<YarnFormValues>(initial ?? EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof YarnFormValues>(
    key: K,
    value: YarnFormValues[K]
  ) => setValues((prev) => ({ ...prev, [key]: value }));

  /**
   * 굵기 등급 표기.
   *
   * 국내 명칭과 영문 명칭을 함께 보여준다. 해외 도안을 국내 실로 옮겨 뜰 때
   * 이 대조가 없으면 어느 굵기인지 고를 수 없다.
   */
  const weightName = (w: YarnWeight) =>
    locale === "ko"
      ? `${w.names.ko} · ${w.names.en}`
      : `${w.names.en} · ${w.names.ja}`;

  // 라벨의 무게·길이로 굵기를 되짚는다. 사용자는 자기 실이 몇 번인지 대개
  // 모르지만 라벨의 두 숫자는 옮겨 적을 수 있다.
  const guessed = guessWeightFromLabel(values.skeinGrams, values.skeinMeters);
  const range = (w: YarnWeight) =>
    `${t.yarn.gaugeRange
      .replace("{min}", String(w.gaugeRange[0]))
      .replace("{max}", String(w.gaugeRange[1]))} · ${t.yarn.needleRange
      .replace("{min}", String(w.needleRangeMm[0]))
      .replace("{max}", String(w.needleRangeMm[1]))}`;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = yarnFormSchema.safeParse(values);
    if (!result.success) {
      setErrors(
        Object.fromEntries(
          result.error.issues.map((i) => [String(i.path[0]), i.message])
        )
      );
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await onSubmit(result.data);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <TextField
        label={t.yarn.name}
        placeholder={t.yarn.namePlaceholder}
        value={values.name}
        error={errors.name}
        autoFocus
        onChange={(e) => set("name", e.target.value)}
      />

      <TextField
        label={t.yarn.brand}
        placeholder={t.yarn.brandPlaceholder}
        value={values.brand ?? ""}
        onChange={(e) => set("brand", str(e.target.value))}
      />

      {/* 화면 색 — 이 앱에서 사용자가 색을 고르는 유일한 자리.
          견본과 색상명을 한 줄에 붙여 "이 색이 이 이름"으로 읽히게 한다.
          견본에 별도 라벨을 달지 않는 것은 한 줄에 라벨이 둘이면 무엇을
          입력하는 칸인지 오히려 흐려지기 때문이다. 힌트가 그 역할을 한다. */}
      <TextField
        label={t.yarn.colorName}
        hint={t.yarn.colorHint}
        value={values.colorName ?? ""}
        onChange={(e) => set("colorName", str(e.target.value))}
        before={
          <input
            type="color"
            aria-label={t.yarn.colorHex}
            value={values.colorHex ?? "#c9ab84"}
            onChange={(e) => set("colorHex", e.target.value)}
            className="border-line-strong size-11 shrink-0 cursor-pointer rounded-md border bg-transparent p-1"
          />
        }
        after={
          values.colorHex && (
            <Button
              icon
              variant="ghost"
              aria-label={t.yarn.colorClear}
              onClick={() => set("colorHex", undefined)}
            >
              <X size={16} />
            </Button>
          )
        }
      />

      <div className="flex gap-3">
        <div className="flex-1">
          <TextField
            label={t.yarn.colorCode}
            value={values.colorCode ?? ""}
            onChange={(e) => set("colorCode", str(e.target.value))}
          />
        </div>
        <div className="flex-1">
          <TextField
            label={t.yarn.dyeLot}
            hint={t.yarn.dyeLotHint}
            value={values.dyeLot ?? ""}
            onChange={(e) => set("dyeLot", str(e.target.value))}
          />
        </div>
      </div>

      <TextField
        label={t.yarn.fiber}
        placeholder={t.yarn.fiberPlaceholder}
        value={values.fiber ?? ""}
        onChange={(e) => set("fiber", str(e.target.value))}
      />

      <div className="flex gap-3">
        <div className="flex-1">
          <TextField
            label={t.yarn.skeinGrams}
            inputMode="numeric"
            value={values.skeinGrams ?? ""}
            onChange={(e) => set("skeinGrams", num(e.target.value))}
          />
        </div>
        <div className="flex-1">
          <TextField
            label={t.yarn.skeinMeters}
            inputMode="numeric"
            value={values.skeinMeters ?? ""}
            onChange={(e) => set("skeinMeters", num(e.target.value))}
          />
        </div>
        <div className="w-24">
          <TextField
            label={t.yarn.skeinCount}
            inputMode="numeric"
            value={values.skeinCount}
            error={errors.skeinCount}
            onChange={(e) => set("skeinCount", num(e.target.value) ?? 0)}
          />
        </div>
      </div>

      {/* 굵기는 무게·길이 뒤에 묻는다. 등급을 먼저 물으면 대부분 "모름"을
          고르는데, 앞의 두 숫자만 있으면 여기서 추정할 수 있다. */}
      <SelectField
        label={t.yarn.weightClass}
        hint={guessed ? undefined : t.yarn.weightHint}
        value={
          values.weightClass === undefined ? "" : String(values.weightClass)
        }
        onChange={(e) =>
          set(
            "weightClass",
            e.target.value === ""
              ? undefined
              : (Number(e.target.value) as YarnWeightClass)
          )
        }
        options={[
          { value: "", label: t.yarn.weightUnset },
          ...YARN_WEIGHTS.map((w) => ({
            value: String(w.cyc),
            label: weightName(w),
          })),
        ]}
      />

      {guessed && values.weightClass === undefined && (
        <div className="bg-sunken mb-4 rounded-md p-3">
          <p className="text-small">
            {t.yarn.weightGuess.replace("{name}", weightName(guessed))}
          </p>
          {/* 등급 이름만 말해주면 그게 뭔지 알 수 없다. 권장 게이지와 바늘을
              함께 보여주면 등급이 무엇을 뜻하는지도 같이 배운다. */}
          <p className="text-text-2 text-caption mt-0.5">{range(guessed)}</p>
          <Button
            variant="secondary"
            className="mt-2"
            onClick={() => set("weightClass", guessed.cyc)}
          >
            {t.yarn.weightApply}
          </Button>
        </div>
      )}

      {/* 고른 등급과 라벨 계산이 다르면 알려주되 고치지 않는다. 실제로 라벨이
          틀린 경우도 있고, 그 판단은 실을 손에 쥔 사람이 한다. */}
      {guessed &&
        values.weightClass !== undefined &&
        guessed.cyc !== values.weightClass && (
          <p className="text-hibernating text-caption mb-4">
            {t.yarn.weightMismatch.replace("{name}", weightName(guessed))}
          </p>
        )}

      <TextField
        label={t.yarn.shop}
        value={values.shop ?? ""}
        onChange={(e) => set("shop", str(e.target.value))}
      />

      <div className="border-line mt-6 flex gap-2 border-t pt-5">
        <Button type="submit" block disabled={saving}>
          {submitLabel}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          {t.action.cancel}
        </Button>
      </div>
    </form>
  );
}
