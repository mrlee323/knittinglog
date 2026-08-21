import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import { useStrings } from "@/i18n";
import type { CounterInput } from "@/features/counter/repository";
import type { Counter, ProjectPiece } from "@/types/entities";

/** 빈 문자열을 undefined로 — 0과 "입력 안 함"은 다르다 */
const num = (raw: string): number | undefined => {
  const parsed = Number(raw);
  return raw.trim() === "" || Number.isNaN(parsed) || parsed <= 0
    ? undefined
    : Math.floor(parsed);
};

export function CounterFormSheet({
  siblings,
  pieces = [],
  onSubmit,
  onCancel,
}: {
  /** 연동 대상 후보 — 같은 프로젝트의 다른 카운터들 */
  siblings: Counter[];
  /** 조각 계획 — 단수가 있는 조각은 이름과 목표를 한 번에 채운다 */
  pieces?: ProjectPiece[];
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
      /* 전에는 여기에 칸의 라벨("이름")을 넣었다. 이름 칸 밑에 "이름"이
         떠도 무엇이 잘못됐는지는 알 수 없다. */
      setError(t.validate.nameRequired);
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
        className="shadow-overlay pb-safe bg-surface max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-lg p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-heading mb-4 font-semibold">{t.counter.add}</h2>

        <TextField
          label={t.counter.label}
          placeholder={t.counter.labelPlaceholder}
          value={label}
          error={error}
          autoFocus
          onChange={(e) => setLabel(e.target.value)}
        />

        {/* 조각에 계획한 단수가 있으면 이름과 목표를 한 번에 채운다.
            예전에는 이 숫자를 사용자가 외워서 옮겨 적었다. 채워진 값은
            그대로 고칠 수 있다 — 칩은 출발점이지 잠금이 아니다. */}
        {pieces.some((p) => p.rows) && (
          <div className="-mt-1 mb-4">
            <p className="text-text-3 text-micro mb-2">{t.counter.fromPiece}</p>
            <div className="flex flex-wrap gap-2">
              {pieces
                .filter((p) => p.rows)
                .map((piece) => (
                  <Button
                    key={piece.id}
                    variant="secondary"
                    className="!text-caption !min-h-9 !px-3"
                    onClick={() => {
                      setLabel(piece.name);
                      setTarget(String(piece.rows));
                      setError(undefined);
                    }}
                  >
                    {piece.name} · {piece.rows}
                    {t.counter.rows}
                  </Button>
                ))}
            </div>
          </div>
        )}

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
                  <p className="text-text-2 text-caption -mt-2 mb-4">
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
