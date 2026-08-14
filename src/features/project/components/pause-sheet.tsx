import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextAreaField } from "@/components/ui/field";
import { useStrings } from "@/i18n";
import { cn } from "@/lib/utils";
import type { PauseReason } from "@/types/entities";

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
        className="pb-safe bg-surface w-full max-w-lg rounded-t-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">{t.project.pauseTitle}</h2>
        <p className="text-text-muted mt-1 mb-4 text-sm">
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
                "rounded-full px-3 py-2 text-sm transition",
                reason === value
                  ? "bg-hibernating text-surface font-medium"
                  : "bg-surface-muted text-text-muted"
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
