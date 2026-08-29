import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";

/**
 * 상태별 스타일.
 *
 * **호버는 `@media (hover: hover)` 안에만 둔다.** 폰에는 호버가 없는데
 * `hover:`를 그냥 쓰면 터치 기기에서 탭한 뒤 호버 상태가 눌러붙는다 — 눌렀던
 * 버튼만 계속 밝은 채로 남아서, 어느 것이 지금 눌린 건지 알 수 없게 된다.
 * 이 앱의 사용자는 폰에 있으므로 이게 기본 케이스다.
 */
const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:opacity-90",
  secondary: "bg-sunken text-text hover:brightness-95",
  ghost: "text-text-2 hover:text-text hover:bg-sunken",
  danger: "text-frogged hover:bg-frogged/10",
};

export interface ButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
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
  /**
   * 처리 중.
   *
   * 라벨을 지우지 않고 **투명하게 두고 그 위에 고리를 얹는다.** 라벨을 스피너로
   * 바꿔치기하면 버튼 폭이 변하고, 폭이 변하면 옆 버튼이 밀려서 사용자가
   * 누르려던 것이 손가락 아래에서 이동한다. 저장 중에 삭제가 눌리는 종류의
   * 사고가 여기서 난다.
   */
  loading?: boolean;
  children?: ReactNode;
}

export function Button({
  variant = "primary",
  block,
  icon,
  loading,
  className,
  type = "button",
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        // 모바일 터치 타깃 최소 44px.
        // nowrap이 없으면 flex 안에서 짧은 라벨이 세로로 쪼개진다.
        "text-small relative inline-flex min-h-11 items-center justify-center gap-2",
        "rounded-md font-medium whitespace-nowrap",
        // 색과 눌림은 tap 속도로. 220ms를 주면 연타할 때 이전 눌림이 안 끝난
        // 상태에서 다음 눌림이 들어와 반응이 뭉갠 것처럼 느껴진다.
        "transition-[opacity,filter,background-color,transform] duration-[90ms] ease-[cubic-bezier(0.2,0,0.4,1)]",
        // 눌린 것을 손가락으로 가려도 알 수 있게 크기로 답한다. 색만 바꾸면
        // 엄지 아래에서는 보이지 않는다.
        "active:scale-[0.97]",
        "disabled:pointer-events-none disabled:opacity-40",
        // 처리 중에는 흐려지지 않는다 — 무엇을 누른 건지 계속 읽혀야 한다
        "aria-busy:opacity-100",
        icon ? "w-11 px-0" : "px-4",
        VARIANTS[variant],
        // block은 "칸을 채운다"는 뜻이므로 줄어들 수도 있어야 한다.
        // w-full과 shrink-0을 함께 주면 한 줄에 둘을 놓는 순간 합이 200%가
        // 되어 뒤 버튼이 컨테이너 밖으로 밀린다.
        block ? "w-full shrink" : "shrink-0",
        className
      )}
      {...props}
    >
      <span
        className={cn("inline-flex items-center gap-2", loading && "opacity-0")}
      >
        {children}
      </span>
      {loading && (
        <span className="absolute inset-0 grid place-items-center">
          <Spinner />
        </span>
      )}
    </button>
  );
}
