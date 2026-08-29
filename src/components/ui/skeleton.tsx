import { cn } from "@/lib/utils";

/**
 * 로딩 중 자리를 지키는 회색 판.
 *
 * **`return null`을 대신하려고 만들었다.** 데이터를 기다리는 동안 아무것도
 * 그리지 않으면 화면을 옮길 때마다 흰 판이 한 번 지나가고, 사용자는 그걸
 * "느리다"가 아니라 "깨졌다"로 읽는다. 앱에서 가장 자주 마주치는 인상이라
 * 여기가 완성도의 바닥을 정한다.
 *
 * 규칙 하나: **완성된 화면과 레이아웃이 같아야 한다.** 스켈레톤이 실제보다
 * 짧거나 개수가 다르면 데이터가 도착하는 순간 화면이 튀는데, 그건 흰 판보다
 * 나쁘다 — 눌리려던 것이 움직여서 오조작이 난다.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "bg-sunken relative overflow-hidden rounded-md",
        // 훑고 지나가는 빛. 정지한 회색 판은 "로딩 중"이 아니라 "빈 칸"으로
        // 읽혀서, 기다리면 되는지 고장인지 구분이 안 된다.
        "after:absolute after:inset-0 after:animate-[kl-shimmer_1.6s_linear_infinite]",
        "after:bg-[linear-gradient(90deg,transparent_0%,var(--color-surface)_50%,transparent_100%)]",
        "after:bg-[length:200%_100%] after:opacity-60",
        className
      )}
      {...props}
    />
  );
}

/**
 * 글 한 덩어리의 스켈레톤.
 *
 * 마지막 줄을 짧게 만든다 — 문단은 끝줄이 짧고, 전부 같은 길이면 글이 아니라
 * 표처럼 보인다.
 */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className="h-3.5 rounded-sm"
          style={{ width: i === lines - 1 ? "62%" : "100%" }}
        />
      ))}
    </div>
  );
}
