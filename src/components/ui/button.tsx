import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:bg-accent-hover",
  secondary: "bg-surface-muted text-text hover:brightness-95",
  ghost: "text-text-muted hover:text-text",
  danger: "text-frogged hover:bg-frogged/10",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** 폭을 꽉 채운다 — 모바일 하단 액션에 쓴다 */
  block?: boolean;
}

export function Button({
  variant = "primary",
  block,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        // 모바일 터치 타깃 최소 44px.
        // shrink-0 + nowrap이 없으면 flex 안에서 짧은 라벨이 세로로 쪼개진다.
        "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium whitespace-nowrap transition disabled:opacity-40",
        VARIANTS[variant],
        block && "w-full",
        className
      )}
      {...props}
    />
  );
}
