import { useBlobImage } from "@/features/photo/use-blob-image";
import type { Inspiration } from "@/types/entities";

/**
 * 보관함 이미지.
 *
 * 사진과 같은 훅을 쓴다 — objectURL을 상태에 담지 않고 ref로 직접 걸어야
 * 카드가 화면에서 사라질 때 정확히 해제된다. 보관함은 스크롤로 훑는 화면이라
 * 여기서 새는 메모리가 바로 쌓인다.
 */
export function InspirationImage({
  item,
  className,
}: {
  item: Inspiration;
  className?: string;
}) {
  // remoteUrl은 2차 동기화용 자리다. 지금은 항상 Blob이 들어온다.
  const ref = useBlobImage(item.remoteUrl ? undefined : item.blob);

  if (!item.blob && !item.remoteUrl) return null;
  return (
    <img
      ref={ref}
      src={item.remoteUrl}
      alt={item.title ?? ""}
      loading="lazy"
      className={className}
    />
  );
}
