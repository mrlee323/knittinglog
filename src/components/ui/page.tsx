import type { ReactNode } from "react";

export function Page({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-5">
      <header className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-title font-semibold tracking-tight">{title}</h1>
        {action}
      </header>
      {children}
    </div>
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
