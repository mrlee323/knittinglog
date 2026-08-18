import { useRef, useState } from "react";
import { Columns2, Trash2, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
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
import { addLink, deleteLink } from "@/features/reference/repository";
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
type Filter = "all" | "pattern" | "reference" | "video";

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
    else await deletePhoto(item.id);
    setPendingDelete(undefined);
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
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
            {(["all", "pattern", "reference", "video"] as Filter[]).map(
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
              : t.workbench.deleteImageConfirm
          }
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
  const container = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [ratio, setRatio] = useState(50);

  const clamp = (value: number) => Math.min(80, Math.max(20, value));

  /**
   * 경계를 끌어 두 칸의 비율을 바꾼다.
   *
   * 도안과 영상이 필요한 폭은 매번 다르다 — 차트 도안은 넓어야 하고, 서술형
   * 도안은 좁아도 읽힌다. 고정 반반으로 두면 둘 중 하나가 늘 아쉽다.
   *
   * 드래그 여부를 ref로 들고 있는다. setPointerCapture는 포인터가 iframe 위를
   * 지나도 이벤트가 끊기지 않게 해주지만, 그것만 믿으면 캡처가 실패한 환경에서
   * 경계가 조용히 움직이지 않는다.
   */
  function startDrag(event: React.PointerEvent<HTMLDivElement>) {
    dragging.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function onDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    const box = container.current?.getBoundingClientRect();
    if (!box) return;
    setRatio(clamp(((event.clientX - box.left) / box.width) * 100));
  }

  const endDrag = () => {
    dragging.current = false;
  };

  if (!split) {
    return <Slot item={left} />;
  }

  return (
    <div
      ref={container}
      className="grid gap-0"
      style={{ gridTemplateColumns: `${ratio}fr 12px ${100 - ratio}fr` }}
    >
      <Slot
        item={left}
        focused={focus === 0}
        onFocus={() => onFocus(0)}
        split
      />
      {/* 키보드로도 옮길 수 있어야 한다. 기준 화면이 PC이고, 마우스를 놓고
          키보드만 쓰는 순간이 실제로 있다. */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={Math.round(ratio)}
        aria-valuemin={20}
        aria-valuemax={80}
        aria-label={t.workbench.resize}
        tabIndex={0}
        onPointerDown={startDrag}
        onPointerMove={onDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setRatio((r) => clamp(r - 5));
          if (e.key === "ArrowRight") setRatio((r) => clamp(r + 5));
        }}
        className="group flex cursor-col-resize items-center justify-center"
      >
        <span className="bg-line group-hover:bg-line-strong h-16 w-[3px] rounded-full transition" />
      </div>
      <Slot
        item={right}
        focused={focus === 1}
        onFocus={() => onFocus(1)}
        split
      />
    </div>
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
        "bg-sunken overflow-hidden rounded-md border transition",
        // 어느 자리에 들어갈지 알 수 있어야 트레이 선택이 예측된다
        split && focused ? "border-accent" : "border-line"
      )}
    >
      <ItemViewer item={item} />
    </div>
  );
}
