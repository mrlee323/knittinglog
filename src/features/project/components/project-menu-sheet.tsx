import { Link } from "@tanstack/react-router";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { useStrings } from "@/i18n";
import type { Id } from "@/types/entities";

/**
 * 프로젝트 관리 메뉴(009).
 *
 * 수정·복제·삭제는 **본문에 있을 일이 아니다.** 전에는 상세 맨 아래에
 * "이대로 다시 뜨기" 카드 하나와 `수정`·`삭제` 줄이 있었는데, 그 셋은
 * 프로젝트를 여는 이유가 아니다. 읽는 자리에 두면 본문 길이를 늘리면서
 * 정작 필요할 때는 끝까지 스크롤해야 찾는다.
 *
 * 시트로 올린다 — `ConfirmSheet`·`PauseSheet`와 같은 규칙이다
 * (docs/DESIGN.md — 그림자는 화면 위에 뜨는 것에만).
 *
 * **삭제는 여기서 끝나지 않는다.** 이 시트는 고르는 자리이고, 되돌릴 수 없는
 * 행동은 `ConfirmSheet`가 한 번 더 묻는다. 시트 안에서 바로 지우면 메뉴를
 * 잘못 눌러 프로젝트가 사라진다.
 */
export function ProjectMenuSheet({
  projectId,
  onEdit,
  onRestart,
  onDelete,
  onClose,
}: {
  projectId: Id;
  /** 수정은 다른 화면이라 링크다. 시트를 닫는 일만 넘겨받는다. */
  onEdit: () => void;
  onRestart: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const t = useStrings();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.project.menu}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        data-project-menu
        className="shadow-overlay pb-safe bg-surface w-full max-w-lg rounded-t-lg p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-micro text-text-3 mb-3">{t.project.menu}</h2>

        <ul className="space-y-1">
          <li>
            <Link
              to="/projects/$projectId/edit"
              params={{ projectId }}
              onClick={onEdit}
              className="hover:bg-sunken flex min-h-11 w-full items-center gap-3 rounded-md px-2 transition"
            >
              <Pencil size={17} aria-hidden className="text-text-3" />
              {t.action.edit}
            </Link>
          </li>

          <li>
            <button
              type="button"
              onClick={onRestart}
              className="hover:bg-sunken flex w-full items-start gap-3 rounded-md px-2 py-2.5 text-left transition"
            >
              <Copy size={17} aria-hidden className="text-text-3 mt-0.5" />
              <span className="min-w-0">
                {t.project.restart}
                {/* 무엇이 딸려 오는지 모르면 누르지 않는다. 본문 카드가
                    들고 있던 문장을 그대로 데려왔다. */}
                <span className="text-text-3 text-caption mt-0.5 block">
                  {t.project.restartHint}
                </span>
              </span>
            </button>
          </li>

          <li>
            <button
              type="button"
              onClick={onDelete}
              className="text-frogged hover:bg-frogged/10 flex min-h-11 w-full items-center gap-3 rounded-md px-2 transition"
            >
              <Trash2 size={17} aria-hidden />
              {t.action.delete}
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
