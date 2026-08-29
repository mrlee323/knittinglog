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

/**
 * 정보 줄에 놓는 실 색 점.
 *
 * 이미지형 카드에서는 `YarnStripe`의 3px 세로선을 쓸 수 없다 — 카드 왼쪽을
 * 세로로 지나가면서 **사진 모서리를 자른다**(docs/DESIGN.md). 그래서 사진
 * 아래 정보 줄로 옮긴 형태다.
 *
 * 색이 없으면 그리지 않는 규칙은 같다.
 */
export function YarnDot({ color }: { color?: string }) {
  if (!color) return null;
  return (
    <span
      aria-hidden
      // 흰색·아주 밝은 실이 흰 배경에서 사라지지 않도록 링을 깐다. YarnTile과
      // 같은 이유이고, 색 자체를 어둡게 만들면 실제 실 색을 왜곡하게 된다.
      className="ring-line size-2.5 shrink-0 rounded-full ring-1 ring-inset"
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
