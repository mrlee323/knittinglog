import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import { useStrings } from "@/i18n";
import type { CounterInput } from "@/features/counter/repository";
import type { Counter } from "@/types/entities";

/** 빈 문자열을 undefined로 — 0과 "입력 안 함"은 다르다 */
const num = (raw: string): number | undefined => {
  const parsed = Number(raw);
  return raw.trim() === "" || Number.isNaN(parsed) || parsed <= 0
    ? undefined
    : Math.floor(parsed);
};

export function CounterFormSheet({
  siblings,
  onSubmit,
  onCancel,
}: {
  /** 연동 대상 후보 — 같은 프로젝트의 다른 카운터들 */
  siblings: Counter[];
  onSubmit: (input: CounterInput) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useStrings();
  const [label, setLabel] = useState("");
  const [target, setTarget] = useState("");
  const [repeatLength, setRepeatLength] = useState("");
  const [repeatTarget, setRepeatTarget] = useState("");
  const [linkedCounterId, setLinkedCounterId] = useState("");
  const [linkRatio, setLinkRatio] = useState("");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const linkedCounter = siblings.find((c) => c.id === linkedCounterId);

  async function submit() {
    if (!label.trim()) {
      setError(t.project.name);
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        label: label.trim(),
        target: num(target),
        repeatLength: num(repeatLength),
        repeatTarget: num(repeatTarget),
        // 비율 없는 연동은 의미가 없으므로 둘 다 있을 때만 건다
        ...(linkedCounterId && num(linkRatio)
          ? { linkedCounterId, linkRatio: num(linkRatio) }
          : {}),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.counter.add}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="pb-safe bg-surface max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold">{t.counter.add}</h2>

        <TextField
          label={t.counter.label}
          placeholder={t.counter.labelPlaceholder}
          value={label}
          error={error}
          autoFocus
          onChange={(e) => setLabel(e.target.value)}
        />

        <TextField
          label={t.counter.target}
          inputMode="numeric"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />

        <div className="flex gap-3">
          <div className="flex-1">
            <TextField
              label={t.counter.repeatLength}
              inputMode="numeric"
              value={repeatLength}
              onChange={(e) => setRepeatLength(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <TextField
              label={t.counter.repeatTarget}
              inputMode="numeric"
              value={repeatTarget}
              onChange={(e) => setRepeatTarget(e.target.value)}
            />
          </div>
        </div>

        {siblings.length > 0 && (
          <>
            <SelectField
              label={t.counter.linkTo}
              value={linkedCounterId}
              onChange={(e) => setLinkedCounterId(e.target.value)}
              options={[
                { value: "", label: t.counter.linkNone },
                ...siblings.map((c) => ({ value: c.id, label: c.label })),
              ]}
            />
            {linkedCounterId && (
              <>
                <TextField
                  label={t.counter.linkRatio}
                  inputMode="numeric"
                  value={linkRatio}
                  onChange={(e) => setLinkRatio(e.target.value)}
                />
                {num(linkRatio) && linkedCounter && (
                  <p className="text-text-muted -mt-2 mb-4 text-xs">
                    {t.counter.linkedHint
                      .replace("{main}", linkedCounter.label)
                      .replace("{ratio}", String(num(linkRatio)))}
                  </p>
                )}
              </>
            )}
          </>
        )}

        <div className="mt-2 flex gap-2">
          <Button block disabled={saving} onClick={() => void submit()}>
            {t.action.create}
          </Button>
          <Button variant="secondary" onClick={onCancel}>
            {t.action.cancel}
          </Button>
        </div>
      </div>
    </div>
  );
}
