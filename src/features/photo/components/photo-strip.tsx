import { PhotoImage } from "@/features/photo/components/photo-image";
import type { ProjectPhoto } from "@/types/entities";

/**
 * 사진 몇 장을 줄로 보여주는 미리보기.
 *
 * 개요 화면의 몫은 "있다는 것을 알리고 그쪽으로 보내는 것"이다. 개요에서
 * 전부 보여주면 개요가 다시 세로로 긴 문서가 된다.
 */
export function PhotoStrip({
  photos,
  limit = 4,
}: {
  photos: ProjectPhoto[];
  limit?: number;
}) {
  if (photos.length === 0) return null;
  return (
    <ul className="flex gap-1.5">
      {photos.slice(0, limit).map((photo) => (
        <li
          key={photo.id}
          className="border-line bg-sunken size-16 shrink-0 overflow-hidden rounded-md border"
        >
          <PhotoImage photo={photo} className="size-full object-cover" />
        </li>
      ))}
      {photos.length > limit && (
        <li className="border-line text-text-2 text-caption flex size-16 shrink-0 items-center justify-center rounded-md border border-dashed">
          +{photos.length - limit}
        </li>
      )}
    </ul>
  );
}
