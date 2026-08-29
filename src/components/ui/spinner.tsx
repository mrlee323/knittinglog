import { cn } from "@/lib/utils";

/**
 * 도는 고리.
 *
 * 화면 전체를 덮는 용도가 아니다 — 그건 스켈레톤이 한다. 여기는 **버튼 안**과
 * 같이 자리가 이미 정해진 곳에서 "누른 게 처리되는 중"을 말한다.
 *
 * 두께를 1.5px로 두는 것은 44px 버튼 안에서 2px 고리가 굵어 보이기 때문이다.
 */
export function Spinner({
  className,
  size = 16,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, borderWidth: 1.5 }}
      className={cn(
        "inline-block shrink-0 animate-[kl-spin_0.7s_linear_infinite] rounded-full",
        // 한 변만 색을 빼서 고리가 도는 게 보이게 한다
        "border-current border-t-transparent opacity-70",
        className
      )}
    />
  );
}
