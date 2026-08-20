import { useState } from "react";
import { Columns2, Trash2, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { SplitPane } from "@/components/ui/split-pane";
import { AddPhotoButton } from "@/features/photo/components/add-photo-button";
import { deletePhoto } from "@/features/photo/repository";
import {
  ItemThumb,
  ItemViewer,
} from "@/features/reference/components/item-viewer";
import {
  preferPattern,
  useWorkbenchItems,
  type ViewerItem,
} from "@/features/reference/items";
import { LinkSheet } from "@/features/reference/components/link-sheet";
import {
  addLink,
  deleteLink,
  markEmbedBlocked,
} from "@/features/reference/repository";
import { AddPdfButton } from "@/features/patternDoc/components/add-pdf-button";
import { deletePatternDoc } from "@/features/patternDoc/repository";
import { useStrings } from "@/i18n";
import { cn } from "@/lib/utils";
import type { Id } from "@/types/entities";

/**
 * 작업대.
 *
 * 도안·참고 이미지·영상을 **동시에** 놓고 보는 화면이다. 세로로 쌓인 문서에서는
 * "도안 보면서 영상 따라가기"가 성립하지 않는데, 그게 뜨개에서 가장 흔한 자세다.
 *
 * 구조는 뷰어 + 트레이다. 큰 자리에 지금 보는 것을 띄우고, 아래 트레이에 나머지를
 * 늘어놓는다. 트레이만 격자로 두면(썸네일만 있는 화면) 도안 글씨를 읽을 수 없고,
 * 뷰어만 두면 다음 것으로 넘어갈 길이 없다.
 *
 * 분할을 켜면 자리가 둘로 갈린다. 트레이에서 고른 항목은 **선택된 자리**에
 * 들어간다 — 자리를 누르면 그 자리가 선택된다. 두 자리에 각각 무엇을 넣을지
 * 매번 묻지 않고, 편집기의 분할 창과 같은 규칙을 쓴다.
 */
type Filter = "all" | "pdf" | "pattern" | "reference" | "video";

export function Workbench({ projectId }: { projectId: Id }) {
  const t = useStrings();

  const { items, loading } = useWorkbenchItems(projectId);

  const [filter, setFilter] = useState<Filter>("all");
  const [split, setSplit] = useState(false);
  const [slots, setSlots] = useState<[Id | undefined, Id | undefined]>([
    undefined,
    undefined,
  ]);
  const [focus, setFocus] = useState<0 | 1>(0);
  const [addingLink, setAddingLink] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ViewerItem>();

  if (loading) return null;

  const shown = items.filter((i) => filter === "all" || i.kind === filter);
  const byId = (id: Id | undefined) => items.find((i) => i.id === id);

  /**
   * 자리에 무엇이 놓일지는 저장하지 않고 매번 계산한다.
   *
   * 고른 id를 저장하되 화면을 그릴 때 목록에서 찾는다. 그러면 항목이 지워져도
   * 자리를 정리하는 뒷처리가 필요 없고(못 찾으면 그냥 기본값으로 돌아간다),
   * 처음 열었을 때도 빈 자리가 보이지 않는다.
   *
   * 기본값은 도안이다. 작업대에 들어오는 이유는 대개 도안을 보려는 것이다.
   */
  const fallback = preferPattern(items);
  const left = byId(slots[0]) ?? fallback;
  const right = byId(slots[1]);

  function pick(item: ViewerItem) {
    setSlots((prev) => {
      const next: [Id | undefined, Id | undefined] = [...prev];
      next[split ? focus : 0] = item.id;
      return next;
    });
  }

  async function handleDelete(item: ViewerItem) {
    if (item.kind === "video") await deleteLink(item.id);
    else if (item.kind === "pdf") await deletePatternDoc(item.id);
    else await deletePhoto(item.id);
    setPendingDelete(undefined);
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/* 상용 도안이 PDF로 오므로 PDF를 먼저 둔다 */}
        <AddPdfButton
          projectId={projectId}
          onAdded={(id) => pick({ id, kind: "pdf" })}
        />
        <AddPhotoButton
          projectId={projectId}
          kind="pattern"
          label={t.workbench.addPattern}
          onAdded={(id) => pick({ id, kind: "pattern" })}
        />
        <AddPhotoButton
          projectId={projectId}
          kind="reference"
          label={t.workbench.addReference}
        />
        <Button variant="secondary" onClick={() => setAddingLink(true)}>
          <Youtube size={16} aria-hidden />
          {t.reference.addVideo}
        </Button>

        {/* 분할은 좁은 화면에서 켜지 않는다. 폰에서 두 칸으로 나누면 둘 다
            읽을 수 없다 — 거기서는 전환이 분할보다 낫다. */}
        <Button
          variant={split ? "primary" : "secondary"}
          className="ml-auto hidden lg:inline-flex"
          aria-pressed={split}
          onClick={() => setSplit((v) => !v)}
        >
          <Columns2 size={16} aria-hidden />
          {t.workbench.split}
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="border-line rounded-md border border-dashed px-6 py-14 text-center">
          <p className="text-text-2 text-small">{t.workbench.empty}</p>
          <p className="text-text-3 text-caption mx-auto mt-1 max-w-[26rem] text-balance">
            {t.workbench.emptyHint}
          </p>
        </div>
      ) : (
        <>
          <Stage
            split={split}
            focus={focus}
            onFocus={setFocus}
            left={left}
            right={right}
          />

          {/* 트레이 — 종류로 걸러 훑는다 */}
          <div className="no-scrollbar mt-4 flex gap-1.5 overflow-x-auto">
            {(["all", "pdf", "pattern", "reference", "video"] as Filter[]).map(
              (value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  aria-pressed={filter === value}
                  className={cn(
                    "text-caption shrink-0 rounded-sm px-2 py-1.5 transition",
                    filter === value
                      ? "bg-accent text-on-accent font-semibold"
                      : "bg-sunken text-text-2"
                  )}
                >
                  {t.workbench[value]}
                </button>
              )
            )}
          </div>

          <ul className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
            {shown.map((item) => {
              const active = slots[0] === item.id || slots[1] === item.id;
              return (
                <li key={item.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => pick(item)}
                    aria-pressed={active}
                    className={cn(
                      "bg-sunken block aspect-square w-full overflow-hidden rounded-md border transition",
                      active
                        ? "border-accent ring-accent/30 ring-2"
                        : "border-line hover:border-line-strong"
                    )}
                  >
                    <ItemThumb item={item} />
                  </button>
                  {/* 지우기는 트레이에서만 한다. 뷰어에 두면 도안을 보는 중에
                      삭제 버튼이 항상 손 근처에 있게 된다. */}
                  <button
                    type="button"
                    aria-label={t.action.delete}
                    onClick={() => setPendingDelete(item)}
                    className="text-text-2 hover:text-frogged bg-surface/90 absolute top-1 right-1 rounded-sm p-1 opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {addingLink && (
        <LinkSheet
          onCancel={() => setAddingLink(false)}
          onSubmit={async (values) => {
            const id = await addLink(projectId, values);
            setAddingLink(false);
            pick({ id, kind: "video" });
          }}
        />
      )}

      {pendingDelete && (
        <ConfirmSheet
          title={
            pendingDelete.kind === "video"
              ? t.workbench.deleteVideoConfirm
              : pendingDelete.kind === "pdf"
                ? t.patternDoc.deleteConfirm
                : t.workbench.deleteImageConfirm
          }
          description={pendingDelete.doc?.name}
          confirmLabel={t.action.delete}
          onCancel={() => setPendingDelete(undefined)}
          onConfirm={() => void handleDelete(pendingDelete)}
        />
      )}
    </div>
  );
}

/* --- 뷰어 ----------------------------------------------------------------- */

function Stage({
  split,
  focus,
  onFocus,
  left,
  right,
}: {
  split: boolean;
  focus: 0 | 1;
  onFocus: (slot: 0 | 1) => void;
  left?: ViewerItem;
  right?: ViewerItem;
}) {
  const t = useStrings();

  // 분할 비율 조작은 뜨기 모드와 같은 컴포넌트를 쓴다 — 손에 익은 동작이
  // 화면마다 다르면 매번 다시 익혀야 한다.
  return (
    <SplitPane
      direction="row"
      label={t.workbench.resize}
      first={
        <Slot
          item={left}
          focused={split ? focus === 0 : undefined}
          onFocus={split ? () => onFocus(0) : undefined}
          split={split}
        />
      }
      second={
        split ? (
          <Slot
            item={right}
            focused={focus === 1}
            onFocus={() => onFocus(1)}
            split
          />
        ) : undefined
      }
    />
  );
}
function Slot({
  item,
  focused,
  onFocus,
  split,
}: {
  item?: ViewerItem;
  focused?: boolean;
  onFocus?: () => void;
  split?: boolean;
}) {
  return (
    <div
      onPointerDown={onFocus}
      className={cn(
        "bg-sunken rounded-md border transition",
        // 영상일 때는 잘라내지 않는다.
        //
        // iframe을 overflow:hidden + 둥근 모서리로 자르면 iOS Safari가 잘린
        // 영역의 히트테스트를 잘못 잡아, 플레이어 안 버튼이 눌리지 않는
        // 경우가 있다. 영상은 iframe 자체가 이미 테두리와 모서리를 갖고 있어서
        // 여기서 자를 이유가 없다.
        item?.kind !== "video" && "overflow-hidden",
        // 어느 자리에 들어갈지 알 수 있어야 트레이 선택이 예측된다
        split && focused ? "border-accent" : "border-line"
      )}
    >
      <ItemViewer
        item={item}
        onEmbedBlocked={(id) => void markEmbedBlocked(id)}
      />
    </div>
  );
}
