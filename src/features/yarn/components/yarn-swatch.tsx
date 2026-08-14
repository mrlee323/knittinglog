import { cn } from "@/lib/utils";

/**
 * 실 색.
 *
 * 디자인 방향(docs/DESIGN.md)에서 UI는 무채색이고, 실과 사진만 색을 갖는다.
 * 그래서 이 컴포넌트가 앱에서 자유로운 채도를 갖는 거의 유일한 지점이다.
 *
 * 색이 없으면 아무것도 그리지 않는다. 회색 자리표시자를 두면 "색 없음"이
 * 하나의 색처럼 보이고, UI가 임의의 색을 만들어내는 순간 원칙이 깨진다.
 */
export function YarnStripe({ color }: { color?: string }) {
  if (!color) return null;
  return (
    <span
      aria-hidden
      className="w-[3px] shrink-0 self-stretch rounded-full"
      style={{ background: color }}
    />
  );
}

export function YarnTile({
  color,
  size = "md",
  className,
}: {
  color?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const box = size === "sm" ? "size-6" : "size-11";

  if (!color) {
    return (
      <span
        aria-hidden
        className={cn(
          "border-line shrink-0 rounded-sm border border-dashed",
          box,
          className
        )}
      />
    );
  }

  return (
    <span
      aria-hidden
      // 흰색·아주 밝은 실이 흰 배경에서 사라지지 않도록 테두리를 깐다.
      // 색 자체를 어둡게 조정하면 실제 실 색을 왜곡하게 된다.
      className={cn(
        "ring-line shrink-0 rounded-sm ring-1 ring-inset",
        box,
        className
      )}
      style={{ background: color }}
    />
  );
}
