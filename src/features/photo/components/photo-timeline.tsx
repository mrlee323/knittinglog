import { useRef, useState } from "react";
import { Camera, ImagePlus } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { addPhoto, listPhotos } from "@/features/photo/repository";
import {
  PhotoImage,
  PhotoStamp,
} from "@/features/photo/components/photo-image";
import { PhotoViewer } from "@/features/photo/components/photo-viewer";
import { useStrings } from "@/i18n";
import { cn } from "@/lib/utils";
import type { Id } from "@/types/entities";

/**
 * 작품 사진 타임라인.
 *
 * 이 앱에서 사진은 장식이 아니라 복귀 수단이다. 그래서 갤러리처럼 균일한
 * 격자로 늘어놓지 않고 **마지막 모습을 크게** 보여주고 나머지를 아래 줄에
 * 담는다. 3개월 만에 프로젝트를 열었을 때 필요한 건 "가장 최근에 어디까지
 * 떴는지" 한 장이다(docs/PLAN.md §3.1 복귀 브리핑).
 */
export function PhotoTimeline({ projectId }: { projectId: Id }) {
  const t = useStrings();
  const photos = useLiveQuery(() => listPhotos(projectId), [projectId]);
  const [openAt, setOpenAt] = useState<number>();

  if (photos === undefined) return null;

  const [latest, ...rest] = photos;

  return (
    <section className="mb-6">
      {latest ? (
        <>
          <button
            type="button"
            onClick={() => setOpenAt(0)}
            className="border-line bg-sunken block w-full overflow-hidden rounded-md border"
          >
            <PhotoImage
              photo={latest}
              className="aspect-[4/3] w-full object-cover"
            />
          </button>
          {/* 단수는 사진 밖에 둔다. 사진 위에 얹으면 편물 색에 따라 읽히지
              않는 경우가 생기고, 이 값은 읽혀야 의미가 있는 정보다. */}
          <div className="text-text-2 text-caption mt-2 flex items-center gap-2">
            <PhotoStamp photo={latest} />
            <span className="ml-auto">
              {t.photo.count.replace("{n}", String(photos.length))}
            </span>
          </div>

          <div className="no-scrollbar -mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4">
            {rest.map((photo, i) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setOpenAt(i + 1)}
                className="border-line bg-sunken size-16 shrink-0 overflow-hidden rounded-md border"
              >
                <PhotoImage photo={photo} className="size-full object-cover" />
              </button>
            ))}
            <AddButton projectId={projectId} compact />
          </div>
        </>
      ) : (
        <div className="border-line rounded-md border border-dashed px-6 py-8 text-center">
          <p className="text-text-2 text-small">{t.photo.empty}</p>
          <p className="text-text-3 text-caption mx-auto mt-1 max-w-[19rem] text-balance">
            {t.photo.emptyHint}
          </p>
          <div className="mt-4 flex justify-center">
            <AddButton projectId={projectId} />
          </div>
        </div>
      )}

      {openAt !== undefined && (
        <PhotoViewer
          projectId={projectId}
          photos={photos}
          index={openAt}
          onIndex={setOpenAt}
          onClose={() => setOpenAt(undefined)}
        />
      )}
    </section>
  );
}

/**
 * 사진 추가.
 *
 * capture 속성을 주지 않는다. 카메라를 강제하면 이미 찍어둔 사진을 고를 수
 * 없어지는데, 뜨다가 찍어놓고 나중에 등록하는 쪽이 훨씬 흔하다.
 */
function AddButton({
  projectId,
  compact,
}: {
  projectId: Id;
  compact?: boolean;
}) {
  const t = useStrings();
  const input = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  async function handleFiles(files: FileList) {
    setSaving(true);
    try {
      // 한 장씩 처리한다. 여러 장을 동시에 디코딩하면 저사양 폰에서
      // 메모리가 튀어 탭이 죽는다.
      for (const file of Array.from(files)) {
        await addPhoto(projectId, file);
      }
    } finally {
      setSaving(false);
      // 같은 파일을 다시 고를 수 있게 비운다. 안 비우면 두 번째 선택에서
      // change 이벤트가 아예 발생하지 않는다.
      if (input.current) input.current.value = "";
    }
  }

  return (
    <label
      className={cn(
        "text-small bg-sunken text-text inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition",
        saving && "opacity-40",
        compact ? "border-line size-16 shrink-0 border border-dashed" : "px-4"
      )}
      aria-busy={saving}
    >
      {compact ? (
        <ImagePlus size={18} className="text-text-2" aria-hidden />
      ) : (
        <>
          <Camera size={16} aria-hidden />
          {saving ? t.photo.saving : t.photo.add}
        </>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        disabled={saving}
        className="sr-only"
        aria-label={t.photo.add}
        onChange={(e) => {
          if (e.target.files?.length) void handleFiles(e.target.files);
        }}
      />
    </label>
  );
}
