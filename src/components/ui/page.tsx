import type { ReactNode } from "react";

export function Page({
  title,
  back,
  action,
  children,
}: {
  title: string;
  /**
   * 상위 화면으로 가는 링크. 제목 아래가 아니라 위에 둔다 —
   * 아래에 두면 제목과 본문 사이를 끊어서 제목이 어디에 걸린 건지 흐려진다.
   */
  back?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-5">
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
