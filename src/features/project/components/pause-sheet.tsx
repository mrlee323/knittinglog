import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextAreaField } from "@/components/ui/field";
import { useStrings } from "@/i18n";
import { cn } from "@/lib/utils";
import type { PauseReason } from "@/types/entities";

/*
  보여줄 순서. `PAUSE_REASONS`(정본)와 순서가 다른 건 의도다 — 정본은 타입의
  근거이고 여기는 **자주 있는 사유부터** 놓는다. 실이 떨어지거나 게이지가 안
  맞아서 멈추는 일이 "계절이 지나서"보다 훨씬 흔하다.

  타입이 `PauseReason[]`이라 정본에 없는 값은 컴파일이 막는다. 사유가 늘면
  여기에도 넣어야 하는데, 그건 어디에 끼울지 사람이 정해야 하는 일이다.
*/
const REASONS: PauseReason[] = [
  "out-of-yarn",
  "gauge-failed",
  "too-hard",
  "needle-taken",
  "bored",
  "wrong-season",
  "other",
];

/**
 * 중단 사유를 묻는 시트.
 *
 * 사유를 묻는 것 자체가 기능이다. 중단 사유가 쌓이면 방치 리포트가
 * "당신은 주로 게이지 실패로 멈춥니다"를 말해줄 수 있고,
 * 복귀할 때 무엇부터 해결해야 하는지도 여기서 나온다.
 */
export function PauseSheet({
  onConfirm,
  onCancel,
}: {
  onConfirm: (reason: PauseReason, note?: string) => void;
  onCancel: () => void;
}) {
  const t = useStrings();
  const [reason, setReason] = useState<PauseReason>("out-of-yarn");
  const [note, setNote] = useState("");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.project.pauseTitle}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="shadow-overlay pb-safe bg-surface w-full max-w-lg rounded-t-lg p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-heading font-semibold">{t.project.pauseTitle}</h2>
        <p className="text-text-2 text-small mt-1 mb-4">
          {t.project.pauseHint}
        </p>

        <div className="mb-4 flex flex-wrap gap-2">
          {REASONS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setReason(value)}
              aria-pressed={reason === value}
              className={cn(
                "text-small rounded-sm px-3 py-2 transition",
                reason === value
                  ? "bg-accent text-on-accent font-medium"
                  : "bg-sunken text-text-2"
              )}
            >
              {t.pauseReason[value]}
            </button>
          ))}
        </div>

        <TextAreaField
          label={t.project.notes}
          rows={3}
          value={note}
          placeholder={t.project.notesPlaceholder}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="flex gap-2">
          <Button
            block
            onClick={() => onConfirm(reason, note.trim() || undefined)}
          >
            {t.event.PAUSE}
          </Button>
          <Button variant="secondary" onClick={onCancel}>
            {t.action.cancel}
          </Button>
        </div>
      </div>
    </div>
  );
}
