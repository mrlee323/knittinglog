import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:opacity-90",
  secondary: "bg-sunken text-text hover:brightness-95",
  ghost: "text-text-2 hover:text-text",
  danger: "text-frogged hover:bg-frogged/10",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** 폭을 꽉 채운다 — 모바일 하단 액션에 쓴다 */
  block?: boolean;
  /**
   * 아이콘 하나만 담는 정사각 버튼.
   *
   * 좌우 패딩을 줄이는 대신 정사각으로 만든다. 패딩만 줄이면 44px 아래로
   * 내려가는데, 뜨개는 손에 실을 쥔 채 조작하는 앱이라 타깃을 줄일 수 없다.
   * `aria-label`을 반드시 함께 준다.
   */
  icon?: boolean;
}

export function Button({
  variant = "primary",
  block,
  icon,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        // 모바일 터치 타깃 최소 44px.
        // nowrap이 없으면 flex 안에서 짧은 라벨이 세로로 쪼개진다.
        "text-small inline-flex min-h-11 items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition disabled:opacity-40",
        icon ? "w-11 px-0" : "px-4",
        VARIANTS[variant],
        // block은 "칸을 채운다"는 뜻이므로 줄어들 수도 있어야 한다.
        // w-full과 shrink-0을 함께 주면 한 줄에 둘을 놓는 순간 합이 200%가
        // 되어 뒤 버튼이 컨테이너 밖으로 밀린다.
        block ? "w-full shrink" : "shrink-0",
        className
      )}
      {...props}
    />
  );
}
