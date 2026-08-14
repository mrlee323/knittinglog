import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { useUnits } from "@/app/units";
import {
  EASE_PRESETS,
  MEASUREMENT_KEYS,
  nearestEasePreset,
  type MeasurementKey,
} from "@/domain/body";
import {
  profileFormSchema,
  type ProfileFormValues,
} from "@/features/profile/repository";
import { useStrings } from "@/i18n";
import { cn } from "@/lib/utils";

const EMPTY: ProfileFormValues = { name: "", measurements: {} };

export function ProfileForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: ProfileFormValues;
  submitLabel: string;
  onSubmit: (values: ProfileFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useStrings();
  const units = useUnits();
  const [values, setValues] = useState<ProfileFormValues>(initial ?? EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // 아직 안 고른 상태와 0cm를 고른 상태는 다르다. undefined일 때 어떤 칩도
  // 선택돼 보이면 안 된다 — 고르지 않은 걸 고른 것처럼 보이게 만든다.
  const selectedEase =
    values.preferredEaseCm === undefined
      ? null
      : nearestEasePreset(values.preferredEaseCm);

  /** 화면에서 받은 값을 cm으로 되돌려 저장한다. 저장은 언제나 cm. */
  const setMeasurement = (key: MeasurementKey, raw: string) => {
    const display = raw.trim() === "" ? undefined : Number(raw);
    setValues((prev) => ({
      ...prev,
      measurements: {
        ...prev.measurements,
        [key]:
          display === undefined || Number.isNaN(display)
            ? undefined
            : units.toCm(display),
      },
    }));
  };

  const measurementValue = (key: MeasurementKey) => {
    const cm = values.measurements[key];
    if (cm === undefined) return "";
    // 소수점 꼬리를 잘라서 입력창이 지저분해지지 않게 한다
    return String(Number(units.fromCm(cm).toFixed(1)));
  };

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = profileFormSchema.safeParse(values);
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
        label={t.profile.name}
        placeholder={t.profile.namePlaceholder}
        value={values.name}
        error={errors.name}
        autoFocus
        onChange={(e) => setValues((p) => ({ ...p, name: e.target.value }))}
      />

      {/* 여유분 — 음수가 오타가 아니라 핏이라는 걸 프리셋으로 드러낸다 */}
      <div className="mb-4">
        <span className="text-text-2 text-small mb-1.5 block">
          {t.profile.ease}
        </span>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {EASE_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              aria-pressed={selectedEase === preset.key}
              onClick={() =>
                setValues((p) => ({ ...p, preferredEaseCm: preset.cm }))
              }
              className={cn(
                "text-caption rounded-sm px-2 py-1.5 transition",
                selectedEase === preset.key
                  ? "bg-accent text-on-accent font-semibold"
                  : "bg-sunken text-text-2"
              )}
            >
              {t.profile.easePreset[preset.key]}
            </button>
          ))}
        </div>
        <TextField
          label={`${t.profile.ease} (${units.lengthLabel})`}
          className="mb-0"
          inputMode="numeric"
          value={
            values.preferredEaseCm === undefined
              ? ""
              : String(Number(units.fromCm(values.preferredEaseCm).toFixed(1)))
          }
          onChange={(e) => {
            const raw = e.target.value.trim();
            const parsed = raw === "" ? undefined : Number(raw);
            setValues((p) => ({
              ...p,
              preferredEaseCm:
                parsed === undefined || Number.isNaN(parsed)
                  ? undefined
                  : units.toCm(parsed),
            }));
          }}
        />
        <p className="text-text-3 text-caption mt-1.5">{t.profile.easeHint}</p>
      </div>

      <div className="grid grid-cols-2 gap-x-3">
        {MEASUREMENT_KEYS.map((key) => (
          <TextField
            key={key}
            label={`${t.profile.measure[key]} (${units.lengthLabel})`}
            inputMode="numeric"
            value={measurementValue(key)}
            onChange={(e) => setMeasurement(key, e.target.value)}
          />
        ))}
      </div>

      <div className="mt-2 flex gap-2">
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
