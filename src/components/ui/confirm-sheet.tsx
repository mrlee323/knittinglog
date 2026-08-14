import { Button } from "@/components/ui/button";
import { useStrings } from "@/i18n";

/**
 * 되돌릴 수 없는 행동을 한 번 더 묻는 시트.
 *
 * window.confirm을 쓰지 않는 이유는 취향이 아니라 일관성이다. 브라우저 기본
 * 대화상자는 이 앱의 서체·색·모서리를 하나도 따르지 않고, 다크 모드에서
 * 갑자기 흰 상자가 튀어나온다. 확인 절차는 화면의 일부여야 한다.
 *
 * 시트가 아래에서 올라오는 것은 PauseSheet·AllocateSheet와 같은 규칙이다
 * (docs/DESIGN.md — 그림자는 화면 위에 뜨는 것에만).
 */
export function ConfirmSheet({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  description?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useStrings();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="shadow-overlay pb-safe bg-surface w-full max-w-lg rounded-t-lg p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-heading font-semibold text-balance">{title}</h2>
        {description && (
          <p className="text-text-2 text-small mt-1">{description}</p>
        )}

        {/* 취소를 먼저 둔다. 확인이 엄지 위치에 오면 습관적으로 눌린다. */}
        <div className="mt-5 flex gap-2">
          <Button block variant="secondary" onClick={onCancel}>
            {t.action.cancel}
          </Button>
          <Button block variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
