import { useState } from "react";
import {
  ItemThumb,
  ItemViewer,
} from "@/features/reference/components/item-viewer";
import { preferPattern, useWorkbenchItems } from "@/features/reference/items";
import { useStrings } from "@/i18n";
import { cn } from "@/lib/utils";
import type { Id } from "@/types/entities";

/**
 * 뜨는 중에 보는 도안 패널.
 *
 * 뜨개의 실제 자세는 "도안을 보면서 세는 것"이다. 그런데 카운터와 도안이 다른
 * 화면에 있으면 한 손으로 화면을 왕복해야 하고, 그러면 도안 대신 종이를 옆에
 * 놓게 된다 — 그 순간 앱은 카운터로 축소된다.
 *
 * 그래서 넓은 화면에서는 뜨기 화면 왼쪽에 도안을 붙여둔다. 폰에서는 붙이지
 * 않는다. 세로 화면을 반으로 나누면 도안도 카운터도 못 쓴다.
 *
 * 트레이는 작업대와 같은 목록을 쓰지만 여기서는 고르는 것만 한다. 추가·삭제는
 * 뜨는 중에 할 일이 아니고, 손이 실에 묶인 채로 누를 버튼이 늘어나면 오조작만
 * 늘어난다.
 */
export function KnitPanel({ projectId }: { projectId: Id }) {
  const t = useStrings();
  const { items, loading } = useWorkbenchItems(projectId);
  const [selectedId, setSelectedId] = useState<Id>();

  if (loading) return null;

  const current =
    items.find((i) => i.id === selectedId) ?? preferPattern(items);

  if (items.length === 0) {
    return (
      <div className="text-text-3 text-caption flex h-full items-center justify-center px-8 text-center">
        {t.workbench.emptyKnit}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        {/* 자리 높이가 정해져 있으므로 뷰어에 100%를 준다 */}
        <ItemViewer item={current} maxHeight="100%" />
      </div>

      {items.length > 1 && (
        <ul className="no-scrollbar border-line flex shrink-0 gap-1.5 overflow-x-auto border-t p-2">
          {items.map((item) => {
            const active = item.id === current?.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  aria-pressed={active}
                  className={cn(
                    "bg-sunken block size-14 overflow-hidden rounded-md border transition",
                    active
                      ? "border-accent ring-accent/30 ring-2"
                      : "border-line"
                  )}
                >
                  <ItemThumb item={item} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
