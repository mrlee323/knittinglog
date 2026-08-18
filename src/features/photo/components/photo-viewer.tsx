import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Star, Trash2, X } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { Button } from "@/components/ui/button";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import {
  PhotoImage,
  PhotoStamp,
} from "@/features/photo/components/photo-image";
import {
  deletePhoto,
  setCover,
  updateCaption,
} from "@/features/photo/repository";
import { getProject } from "@/features/project/repository";
import { useLocale, useStrings } from "@/i18n";
import type { Id, ProjectPhoto } from "@/types/entities";

/**
 * 사진 전체보기.
 *
 * 바탕은 테마와 무관하게 어둡다. 사진을 볼 때 주변이 밝으면 색이 실제보다
 * 탁해 보이는데, 이 앱에서 사진은 실 색을 판단하는 근거이기도 하다.
 * 디자인 시스템의 무채색 규칙은 크롬에 적용되고 여기는 사진의 무대다.
 */
export function PhotoViewer({
  projectId,
  photos,
  index,
  onIndex,
  onClose,
}: {
  projectId: Id;
  photos: ProjectPhoto[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const t = useStrings();
  const locale = useLocale();
  const project = useLiveQuery(() => getProject(projectId), [projectId]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const photo = photos[index];

  // 사진이 지워지면 목록이 줄어들어 인덱스가 끝을 넘어간다. 그때는 닫는다.
  useEffect(() => {
    if (!photo) onClose();
  }, [photo, onClose]);

  // 데스크톱에서 좌우 키와 Esc는 사진 뷰어의 기본 기대다.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
      if (e.key === "ArrowRight" && index < photos.length - 1)
        onIndex(index + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, photos.length, onIndex, onClose]);

  if (!photo) return null;

  const isCover = project?.coverPhotoId === photo.id;
  const formatDate = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(photo.takenAt);

  async function handleDelete() {
    await deletePhoto(photo.id);
    setConfirmingDelete(false);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.photo.title}
      className="fixed inset-0 z-50 flex flex-col bg-black/95"
    >
      <div className="pt-safe flex items-center justify-between px-2">
        <span className="text-caption px-2 text-white/70">
          {index + 1} / {photos.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.action.back}
          className="inline-flex size-11 items-center justify-center text-white/80"
        >
          <X size={20} />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        <PhotoImage
          photo={photo}
          className="max-h-full max-w-full object-contain"
        />

        {index > 0 && (
          <NavButton
            side="left"
            label={t.photo.prev}
            onClick={() => onIndex(index - 1)}
          />
        )}
        {index < photos.length - 1 && (
          <NavButton
            side="right"
            label={t.photo.next}
            onClick={() => onIndex(index + 1)}
          />
        )}
      </div>

      {/* 설명·단수·행동은 사진 아래 밝은 판에 둔다. 사진 위에 반투명으로
          얹으면 편물 색에 따라 읽히지 않는다. */}
      <div className="bg-surface pb-safe rounded-t-lg p-4">
        <div className="text-caption text-text-2 flex items-center gap-2">
          <PhotoStamp photo={photo} />
          <span className="ml-auto">{formatDate}</span>
        </div>

        <input
          key={photo.id}
          defaultValue={photo.caption ?? ""}
          placeholder={t.photo.captionPlaceholder}
          aria-label={t.photo.caption}
          // 저장 버튼을 따로 두지 않는다. 사진 설명은 한 줄짜리 메모라
          // 확인 절차가 붙으면 아무도 안 쓴다.
          onBlur={(e) => void updateCaption(photo.id, e.target.value)}
          className="border-line-strong bg-surface text-small focus:border-focus focus:ring-focus/30 mt-2 min-h-11 w-full rounded-md border px-3 py-2 transition outline-none focus:ring-2"
        />

        <div className="mt-3 flex gap-2">
          <Button
            block
            variant="secondary"
            disabled={isCover}
            onClick={() => void setCover(projectId, photo.id)}
          >
            <Star size={16} aria-hidden />
            {isCover ? t.photo.isCover : t.photo.setCover}
          </Button>
          <Button
            icon
            variant="danger"
            aria-label={t.action.delete}
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 size={18} />
          </Button>
        </div>
      </div>

      {confirmingDelete && (
        <ConfirmSheet
          title={t.photo.deleteConfirm}
          confirmLabel={t.action.delete}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() => void handleDelete()}
        />
      )}
    </div>
  );
}

function NavButton({
  side,
  label,
  onClick,
}: {
  side: "left" | "right";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 -translate-y-1/2 ${side === "left" ? "left-1" : "right-1"} inline-flex size-11 items-center justify-center rounded-full bg-black/40 text-white/90`}
    >
      {side === "left" ? <ChevronLeft size={22} /> : <ChevronRight size={22} />}
    </button>
  );
}
