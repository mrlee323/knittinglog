import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  PhotoImage,
  PhotoStamp,
} from "@/features/photo/components/photo-image";
import { PhotoViewer } from "@/features/photo/components/photo-viewer";
import { AddPhotoButton } from "@/features/photo/components/add-photo-button";
import { listPhotos } from "@/features/photo/repository";
import { useLocale, useStrings } from "@/i18n";
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
        <AddPhotoButton
          projectId={projectId}
          kind="progress"
          icon="camera"
          label={t.photo.add}
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
