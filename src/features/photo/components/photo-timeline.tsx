import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  PhotoImage,
  PhotoStamp,
} from "@/features/photo/components/photo-image";
import { PhotoViewer } from "@/features/photo/components/photo-viewer";
import { addPhoto, listPhotos } from "@/features/photo/repository";
import { useLocale, useStrings } from "@/i18n";
import { cn } from "@/lib/utils";
import type { Id } from "@/types/entities";

/**
 * 진행 기록.
 *
 * 사진 갤러리가 아니라 **히스토리**다. 한 항목은 "언제 · 몇 단 · 그때 모습"이고,
 * 최근 것이 위에 쌓인다. 3개월 만에 프로젝트를 열었을 때 필요한 건 사진 자체가
 * 아니라 "마지막에 어디까지 떴는지"이고, 그건 날짜와 단수가 사진에 붙어 있어야
 * 성립한다(기획 §3.1 복귀 브리핑).
 *
 * 기준 화면이 태블릿·PC라 사진을 줄이지 않는다. 큰 화면에서 진행 사진은 편물의
 * 무늬와 색을 확인하는 자료이기도 하다.
 */
export function PhotoTimeline({ projectId }: { projectId: Id }) {
  const t = useStrings();
  const locale = useLocale();
  const photos = useLiveQuery(() => listPhotos(projectId), [projectId]);
  const [openAt, setOpenAt] = useState<number>();

  if (photos === undefined) return null;

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-heading font-semibold">
          {t.photo.history}
          {photos.length > 0 && (
            <span className="text-text-3 text-small ml-2 font-normal">
              {t.photo.count.replace("{n}", String(photos.length))}
            </span>
          )}
        </h2>
        <AddButton
          projectId={projectId}
          // 사진을 올리면 바로 전체보기를 열어 설명을 적을 수 있게 한다.
          // "이 단에서 뭘 했는지"는 찍은 직후가 아니면 다시 안 쓴다.
          onAdded={() => setOpenAt(0)}
        />
      </div>

      {photos.length === 0 ? (
        <div className="border-line rounded-md border border-dashed px-6 py-10 text-center">
          <p className="text-text-2 text-small">{t.photo.empty}</p>
          <p className="text-text-3 text-caption mx-auto mt-1 max-w-[22rem] text-balance">
            {t.photo.emptyHint}
          </p>
        </div>
      ) : (
        <ol className="space-y-5">
          {photos.map((photo, i) => (
            <li
              key={photo.id}
              className="border-line border-t pt-4 first:border-t-0 first:pt-0"
            >
              {/* 단수가 왼쪽, 날짜가 오른쪽. 훑을 때 눈이 따라가는 건 단수다. */}
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <span className="text-small">
                  <PhotoStamp photo={photo} />
                </span>
                <time
                  dateTime={photo.takenAt.toISOString()}
                  className="text-text-2 text-caption"
                >
                  {formatDate(photo.takenAt)}
                </time>
              </div>

              <button
                type="button"
                onClick={() => setOpenAt(i)}
                className="border-line bg-sunken block w-full overflow-hidden rounded-md border"
              >
                <PhotoImage
                  photo={photo}
                  className="aspect-[4/3] w-full object-cover"
                />
              </button>

              {photo.caption && (
                <p className="text-text-2 text-small mt-2 whitespace-pre-wrap">
                  {photo.caption}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}

      {openAt !== undefined && photos.length > 0 && (
        <PhotoViewer
          projectId={projectId}
          photos={photos}
          index={Math.min(openAt, photos.length - 1)}
          onIndex={setOpenAt}
          onClose={() => setOpenAt(undefined)}
        />
      )}
    </section>
  );
}

/**
 * 기록 추가.
 *
 * capture 속성을 주지 않는다. 카메라를 강제하면 이미 찍어둔 사진을 고를 수
 * 없어지는데, 뜨다가 찍어놓고 나중에 등록하는 쪽이 훨씬 흔하다.
 */
function AddButton({
  projectId,
  onAdded,
}: {
  projectId: Id;
  onAdded?: () => void;
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
      // 여러 장을 한꺼번에 올렸으면 설명 창을 열지 않는다 — 어느 장에
      // 쓰라는 건지 알 수 없고, 그 상태에서 뜨는 창은 방해다.
      if (files.length === 1) onAdded?.();
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
        "text-small bg-sunken text-text inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md px-4 font-medium whitespace-nowrap transition",
        saving && "opacity-40"
      )}
      aria-busy={saving}
    >
      <Camera size={16} aria-hidden />
      {saving ? t.photo.saving : t.photo.add}
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
