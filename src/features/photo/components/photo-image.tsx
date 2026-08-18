import { useBlobImage } from "@/features/photo/use-blob-image";
import { useStrings } from "@/i18n";
import type { ProjectPhoto } from "@/types/entities";

/**
 * 사진 한 장.
 *
 * 타임라인·목록 카드·전체보기가 같은 컴포넌트를 쓴다. 사진마다 훅이 하나씩
 * 붙는 구조여야 objectURL을 그 사진이 화면에서 사라질 때 정확히 해제할 수 있다.
 */
export function PhotoImage({
  photo,
  className,
}: {
  photo: ProjectPhoto;
  className?: string;
}) {
  // remoteUrl은 2차 동기화용 자리다. 지금은 항상 Blob이 들어온다.
  const ref = useBlobImage(photo.remoteUrl ? undefined : photo.blob);

  if (!photo.blob && !photo.remoteUrl) return null;
  return (
    <img
      ref={ref}
      src={photo.remoteUrl}
      alt={photo.caption ?? ""}
      className={className}
    />
  );
}

/** "몸판 62단" — 사진을 시각이 아니라 진행으로 읽게 하는 값 */
export function PhotoStamp({ photo }: { photo: ProjectPhoto }) {
  const t = useStrings();
  if (photo.atRow === undefined) return null;
  return (
    <span className="text-text font-medium">
      {t.photo.atRow
        .replace("{label}", photo.atCounterLabel ?? t.counter.title)
        .replace("{n}", String(photo.atRow))}
    </span>
  );
}
