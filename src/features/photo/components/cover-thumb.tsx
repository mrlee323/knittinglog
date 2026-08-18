import { useBlobImage } from "@/features/photo/use-blob-image";
import { cn } from "@/lib/utils";

/**
 * 목록·대시보드 카드의 대표 사진.
 *
 * 사진이 없으면 자리도 만들지 않는다. 회색 자리표시자를 두면 사진을 아직
 * 안 올린 프로젝트가 "빠진 것"처럼 보이는데, 뜨개는 사진 없이 시작하는 게
 * 정상이다(실 색 세로선과 같은 규칙 — 없으면 그리지 않는다).
 */
export function CoverThumb({
  blob,
  size = "md",
}: {
  blob?: Blob;
  /** 촘촘한 줄에서는 sm. 카드 높이를 사진이 결정하면 목록이 늘어진다. */
  size?: "sm" | "md";
}) {
  const ref = useBlobImage(blob);
  if (!blob) return null;
  return (
    <img
      ref={ref}
      alt=""
      className={cn(
        "border-line shrink-0 rounded-md border object-cover",
        size === "sm" ? "size-11" : "size-16"
      )}
    />
  );
}
