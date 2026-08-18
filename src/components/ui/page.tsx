import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * 화면 틀.
 *
 * 기준 화면이 태블릿·PC이므로(src/routes/__root.tsx) 폭을 두 가지로 나눈다.
 * 기본은 읽기 폭(`2xl`, 672px) — 폼과 설정은 넓혀도 읽기 어려워질 뿐이다.
 * `wide`는 목록·상세·갤러리용(`5xl`, 1024px)으로, 사진과 카드가 여러 열로
 * 놓일 자리다.
 */
export function Page({
  title,
  back,
  action,
  wide,
  children,
}: {
  title: string;
  /**
   * 상위 화면으로 가는 링크. 제목 아래가 아니라 위에 둔다 —
   * 아래에 두면 제목과 본문 사이를 끊어서 제목이 어디에 걸린 건지 흐려진다.
   */
  back?: ReactNode;
  action?: ReactNode;
  /** 여러 열로 펼칠 화면(목록·상세)에 준다 */
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 py-5 md:px-8 md:py-8",
        wide ? "max-w-lg md:max-w-5xl" : "max-w-lg md:max-w-2xl"
      )}
    >
      <header className="mb-5">
        {back && <div className="mb-2">{back}</div>}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-title min-w-0 font-semibold tracking-tight">
            {title}
          </h1>
          {action}
        </div>
      </header>
      {children}
    </div>
  );
}

/**
 * 상세 화면의 두 단.
 *
 * 넓은 화면에서 보는 것(사진·기록)과 조작하는 것(카운터·상태·실)을 나란히
 * 둔다. 폰에서는 한 줄로 쌓이고, 그때 순서는 main → side다.
 *
 * side는 큰 화면에서 화면에 붙는다(sticky). 사진을 훑는 동안 카운터가 시야에서
 * 사라지면 스크롤을 되돌려야 하는데, 카운터는 이 앱에서 가장 자주 누르는 것이다.
 */
export function Columns({ main, side }: { main: ReactNode; side: ReactNode }) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
      <div className="min-w-0">{main}</div>
      <div className="min-w-0 lg:sticky lg:top-8">{side}</div>
    </div>
  );
}

/**
 * 상세 화면의 뒤로가기 링크. 타깃이 44px가 되도록 세로 패딩을 준다.
 * 링크 자체는 Page를 쓰는 쪽에서 라우터로 만들어 넘긴다.
 */
export function BackLink({ children }: { children: ReactNode }) {
  return (
    <span className="text-text-2 text-small hover:text-text -ml-1 inline-flex min-h-11 items-center gap-1 pr-2 pl-1 transition">
      {children}
    </span>
  );
}

/** 스캐폴드 단계의 자리표시자. 화면이 구현되면 제거한다. */
export function Placeholder({ note }: { note: string }) {
  return (
    <div className="border-line bg-sunken text-text-2 text-small rounded-md border border-dashed p-6">
      {note}
    </div>
  );
}

/** 목록·갤러리의 반응형 격자. 폰에서는 한 열, 태블릿부터 여러 열. */
export function CardGrid({
  children,
  columns = 2,
}: {
  children: ReactNode;
  /** 큰 화면에서의 최대 열 수 */
  columns?: 2 | 3;
}) {
  return (
    <ul
      className={cn(
        "grid gap-3 sm:grid-cols-2",
        columns === 3 && "xl:grid-cols-3"
      )}
    >
      {children}
    </ul>
  );
}
