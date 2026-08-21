import { useState, type FormEvent } from "react";
import { Camera } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import {
  gaugeFormSchema,
  type GaugeFormValues,
} from "@/features/gauge/repository";
import { listYarns } from "@/features/yarn/repository";
import { PhotoMeasure } from "./photo-measure";
import { useStrings } from "@/i18n";

/**
 * 작성 중인 값.
 *
 * 코수·단수를 **비워둔 채로** 시작한다. 예전에는 22/30이 미리 채워져 있었는데,
 * 그건 남의 게이지다. 스와치를 처음 재는 사람에게는 그 숫자가 정답처럼 보여서
 * 그대로 저장하게 되고, 그러면 이후 도안 계산이 전부 조용히 틀린다 —
 * 빈칸보다 나쁘다.
 */
type Draft = Omit<GaugeFormValues, "stitchesPer10cm" | "rowsPer10cm"> & {
  stitchesPer10cm?: number;
  rowsPer10cm?: number;
};

const num = (raw: string) => (raw.trim() === "" ? undefined : Number(raw));

export function GaugeForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: GaugeFormValues;
  submitLabel: string;
  onSubmit: (values: GaugeFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useStrings();
  const yarns = useLiveQuery(() => listYarns(), []);
  const [values, setValues] = useState<Draft>(initial ?? {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [measuring, setMeasuring] = useState(false);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = gaugeFormSchema.safeParse(values);
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
        label={t.gauge.label}
        placeholder={t.gauge.labelPlaceholder}
        value={values.label ?? ""}
        autoFocus
        onChange={(e) => set("label", e.target.value.trim() || undefined)}
      />

      {/* 사진으로 재기. 자를 대고 눈으로 세는 대신 사진에서 재면 코수를
          더 넓게 잡을 수 있고, 그게 정확도를 좌우한다(기획 §13.2). */}
      {measuring ? (
        <div className="border-line mb-4 rounded-md border p-3">
          <PhotoMeasure
            onApply={({ stitchesPer10cm, rowsPer10cm }) => {
              set("stitchesPer10cm", stitchesPer10cm);
              set("rowsPer10cm", rowsPer10cm);
              setMeasuring(false);
            }}
          />
          <Button
            variant="ghost"
            className="mt-2"
            onClick={() => setMeasuring(false)}
          >
            {t.action.cancel}
          </Button>
        </div>
      ) : (
        <Button
          variant="secondary"
          className="mb-4"
          onClick={() => setMeasuring(true)}
        >
          <Camera size={16} />
          {t.photoGauge.open}
        </Button>
      )}

      {/* 게이지는 10cm 기준으로만 받는다. 인치권 4인치 기준과 섞으면
          값이 미묘하게 틀어지므로 단위계 토글을 여기 적용하지 않는다. */}
      <div className="flex gap-3">
        <div className="flex-1">
          <TextField
            label={t.gauge.stitches}
            inputMode="decimal"
            value={values.stitchesPer10cm ?? ""}
            error={errors.stitchesPer10cm}
            onChange={(e) => set("stitchesPer10cm", num(e.target.value))}
          />
        </div>
        <div className="flex-1">
          <TextField
            label={t.gauge.rows}
            inputMode="decimal"
            value={values.rowsPer10cm ?? ""}
            error={errors.rowsPer10cm}
            onChange={(e) => set("rowsPer10cm", num(e.target.value))}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <TextField
            label={t.gauge.needleMm}
            inputMode="decimal"
            value={values.needleMm ?? ""}
            onChange={(e) => set("needleMm", num(e.target.value))}
          />
        </div>
        <div className="flex-1">
          <TextField
            label={t.gauge.pattern}
            placeholder={t.gauge.patternPlaceholder}
            value={values.pattern ?? ""}
            onChange={(e) => set("pattern", e.target.value.trim() || undefined)}
          />
        </div>
      </div>

      {yarns && yarns.length > 0 && (
        <SelectField
          label={t.yarn.title}
          value={values.yarnId ?? ""}
          onChange={(e) => set("yarnId", e.target.value || undefined)}
          options={[
            { value: "", label: t.yarn.weightUnset },
            ...yarns.map((y) => ({ value: y.id, label: y.name })),
          ]}
        />
      )}

      <fieldset className="border-line mb-4 rounded-md border p-3">
        <legend className="text-text-2 text-caption px-1">
          {t.gauge.blocked}
        </legend>
        <div className="flex gap-3">
          <div className="flex-1">
            <TextField
              label={t.gauge.stitches}
              className="mb-0"
              inputMode="decimal"
              value={values.blockedStitchesPer10cm ?? ""}
              onChange={(e) =>
                set("blockedStitchesPer10cm", num(e.target.value))
              }
            />
          </div>
          <div className="flex-1">
            <TextField
              label={t.gauge.rows}
              className="mb-0"
              inputMode="decimal"
              value={values.blockedRowsPer10cm ?? ""}
              onChange={(e) => set("blockedRowsPer10cm", num(e.target.value))}
            />
          </div>
        </div>
        <p className="text-text-3 text-caption mt-2">{t.gauge.blockedHint}</p>
      </fieldset>

      <div className="flex gap-2">
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
