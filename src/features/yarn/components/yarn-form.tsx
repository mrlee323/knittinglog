import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import { YARN_WEIGHTS, type YarnWeightClass } from "@/domain/units";
import {
  yarnFormSchema,
  type YarnFormValues,
} from "@/features/yarn/repository";
import { useLocale, useStrings } from "@/i18n";
import { cn } from "@/lib/utils";

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

      {/* 화면 색 — 이 앱에서 사용자가 색을 고르는 유일한 자리 */}
      <div className="mb-4">
        <span className="text-text-2 text-small mb-1.5 block">
          {t.yarn.colorHex}
        </span>
        <div className="flex items-center gap-3">
          <input
            type="color"
            aria-label={t.yarn.colorHex}
            value={values.colorHex ?? "#c9ab84"}
            onChange={(e) => set("colorHex", e.target.value)}
            className="border-line size-11 shrink-0 cursor-pointer rounded-sm border bg-transparent p-1"
          />
          <TextField
            label={t.yarn.colorName}
            className="mb-0"
            value={values.colorName ?? ""}
            onChange={(e) => set("colorName", str(e.target.value))}
          />
          {values.colorHex && (
            <Button
              variant="ghost"
              className="!min-h-9 shrink-0 !px-2"
              onClick={() => set("colorHex", undefined)}
            >
              {t.action.delete}
            </Button>
          )}
        </div>
        <p className="text-text-3 text-caption mt-1.5">{t.yarn.colorHint}</p>
      </div>

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
            value={values.dyeLot ?? ""}
            onChange={(e) => set("dyeLot", str(e.target.value))}
          />
        </div>
      </div>
      <p className="text-text-3 text-caption -mt-2 mb-4">{t.yarn.dyeLotHint}</p>

      <SelectField
        label={t.yarn.weightClass}
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
            // 국내 명칭과 영문 명칭을 함께 보여준다. 해외 도안을 국내 실로
            // 옮겨 뜰 때 이 대조가 없으면 굵기를 못 고른다.
            label:
              locale === "ko"
                ? `${w.names.ko} · ${w.names.en}`
                : `${w.names.en} · ${w.names.ja}`,
          })),
        ]}
      />

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

      <TextField
        label={t.yarn.shop}
        value={values.shop ?? ""}
        onChange={(e) => set("shop", str(e.target.value))}
      />

      <div className={cn("mt-6 flex gap-2")}>
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
