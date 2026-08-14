import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { LifeBuoy, Plus, Minus, Undo2, X, Sun } from "lucide-react";
import {
  counterView,
  isLinked,
  lastLifelineBelow,
  rowsToUnravel,
} from "@/domain/counter";
import { haptic, useWakeLock } from "@/hooks/useWakeLock";
import {
  addMark,
  endSession,
  lifelineRows,
  listCounters,
  reconcileProject,
  restoreValues,
  startSession,
  step,
} from "@/features/counter/repository";
import { getProject } from "@/features/project/repository";
import { useStrings } from "@/i18n";
import { cn } from "@/lib/utils";
import type { Id } from "@/types/entities";

export const Route = createFileRoute("/projects/$projectId/knit")({
  component: KnitMode,
});

/**
 * 되돌리기 스택에 쌓이는 한 걸음.
 *
 * 되돌릴 이전 값들과 함께 그 걸음의 증감폭을 들고 있는다. 되돌릴 때
 * 세션 단수도 같이 깎아야 하기 때문이다 — 세션 기록은 뜨는 속도와
 * 완성 예상일의 입력이라 부풀면 추정이 통째로 틀어진다.
 */
type UndoEntry = { values: { id: Id; value: number }[]; delta: number };

function KnitMode() {
  const t = useStrings();
  const navigate = useNavigate();
  const { projectId } = Route.useParams();

  const project = useLiveQuery(() => getProject(projectId), [projectId]);
  const counters = useLiveQuery(() => listCounters(projectId), [projectId]);

  const [selectedId, setSelectedId] = useState<Id | null>(null);
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [sessionRows, setSessionRows] = useState(0);

  const screenOn = useWakeLock(true);

  // 선택은 항상 id(원시값)로 들고 다닌다. 훅 의존성에 Dexie 배열이나
  // 거기서 파생한 객체를 넣으면 React Compiler가 최적화를 포기한다.
  // 기본 선택은 별도 쿼리로 id만 받아 원시값으로 유지한다.
  const firstCounterId = useLiveQuery(
    async () => (await listCounters(projectId))[0]?.id ?? null,
    [projectId]
  );
  const activeId = selectedId ?? firstCounterId ?? null;

  const selected = counters?.find((c) => c.id === activeId) ?? null;

  const lifelines = useLiveQuery(
    () => (activeId ? lifelineRows(activeId) : Promise.resolve([])),
    [activeId]
  );

  // 뜨기 시작 전에 연동 값을 메인 기준으로 한 번 맞춘다.
  // 파생식이라 언제 불러도 결과가 같고, 어긋난 채 남은 값이 스스로 회복된다.
  useEffect(() => {
    void reconcileProject(projectId);
  }, [projectId]);

  /* 세션은 카운터별로 잡는다. 카운터를 바꾸면 이전 세션을 닫는다. */
  const sessionRef = useRef<{ id: Id; rows: number } | null>(null);

  useEffect(() => {
    if (!activeId) return;
    let active = true;

    void startSession(projectId, activeId).then((id) => {
      if (active) sessionRef.current = { id, rows: 0 };
      else void endSession(id, 0);
    });

    return () => {
      active = false;
      const session = sessionRef.current;
      sessionRef.current = null;
      if (session) void endSession(session.id, session.rows);
    };
  }, [projectId, activeId]);

  async function doStep(delta: number) {
    if (!activeId || !counters) return;

    // 되돌리기용으로 바뀌기 전 값을 먼저 찍어둔다
    const before = counters.map((c) => ({ id: c.id, value: c.value }));
    const updates = await step(projectId, activeId, delta);
    if (updates.length === 0) return;

    haptic(delta > 0 ? 12 : [8, 40, 8]);

    const changed = new Set(updates.map((u) => u.id));
    setUndoStack((stack) => [
      ...stack.slice(-49),
      { values: before.filter((b) => changed.has(b.id)), delta },
    ]);

    if (sessionRef.current) sessionRef.current.rows += delta;
    setSessionRows((n) => Math.max(0, n + delta));
  }

  async function undo() {
    const entry = undoStack.at(-1);
    if (!entry) return;

    // 되돌리기는 저장된 이전 값을 그대로 복원한다. 연동 카운터도 함께
    // 찍어뒀으므로 메인만 되돌아가 어긋나는 일이 없다.
    await restoreValues(entry.values);

    haptic([8, 40, 8]);
    setUndoStack((stack) => stack.slice(0, -1));

    // 되돌린 걸음만큼 세션 단수도 되돌린다
    if (sessionRef.current) sessionRef.current.rows -= entry.delta;
    setSessionRows((n) => Math.max(0, n - entry.delta));
  }

  if (!project || !counters) return null;

  if (counters.length === 0) {
    return (
      <EmptyKnit
        onLeave={() =>
          navigate({ to: "/projects/$projectId", params: { projectId } })
        }
      />
    );
  }

  const view = selected ? counterView(selected) : null;
  const lifeline = lastLifelineBelow(selected?.value ?? 0, lifelines ?? []);
  const linked = selected ? isLinked(selected) : false;
  const mainCounter = counters.find((c) => c.id === selected?.linkedCounterId);

  return (
    <div className="pt-safe pb-safe bg-bg flex h-dvh flex-col">
      {/* --- 상단 --- */}
      <header className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          aria-label={t.action.back}
          onClick={() =>
            navigate({ to: "/projects/$projectId", params: { projectId } })
          }
          className="text-text-muted rounded-lg p-2"
        >
          <X size={22} />
        </button>
        <p className="text-text-muted min-w-0 flex-1 truncate text-sm">
          {project.name}
        </p>
        {screenOn && (
          <span
            title={t.counter.screenOn}
            aria-label={t.counter.screenOn}
            className="text-accent"
          >
            <Sun size={18} />
          </span>
        )}
      </header>

      {counters.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-3 pb-2">
          {counters.map((counter) => (
            <button
              key={counter.id}
              type="button"
              onClick={() => setSelectedId(counter.id)}
              aria-pressed={counter.id === activeId}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-sm transition",
                counter.id === activeId
                  ? "bg-accent text-accent-fg font-medium"
                  : "bg-surface-muted text-text-muted"
              )}
            >
              {counter.label} {counter.value}
            </button>
          ))}
        </div>
      )}

      {/* --- 숫자 --- */}
      <section className="px-5 pt-2 pb-4 text-center">
        <p className="text-text-muted text-sm">{selected?.label}</p>
        <p className="text-7xl leading-none font-semibold tracking-tight tabular-nums">
          {view?.value ?? 0}
        </p>

        {view?.target && (
          <>
            <p className="text-text-muted mt-1 text-sm">/ {view.target}</p>
            <div className="bg-surface-muted mx-auto mt-3 h-1.5 max-w-xs overflow-hidden rounded-full">
              <div
                className="bg-accent h-full rounded-full transition-[width]"
                style={{ width: `${(view.progress ?? 0) * 100}%` }}
              />
            </div>
          </>
        )}

        <div className="text-text-muted mt-3 space-y-0.5 text-sm">
          {view?.remaining !== undefined && !view.done && (
            <p>{t.counter.remaining.replace("{n}", String(view.remaining))}</p>
          )}
          {view?.done && (
            <p className="text-active font-medium">{t.counter.done}</p>
          )}
          {view?.repeat && (
            <p>
              {t.counter.repeatProgress
                .replace("{done}", String(view.repeat.completed))
                .replace("{row}", String(view.repeat.rowInRepeat))
                .replace("{len}", String(view.repeat.length))}
              {view.repeat.target && (
                <>
                  {" · "}
                  {t.counter.repeatOf
                    .replace("{done}", String(view.repeat.completed))
                    .replace("{target}", String(view.repeat.target))}
                </>
              )}
            </p>
          )}
        </div>

        {/* 생명줄 — 실수해도 여기까지만 풀면 된다는 안전선 */}
        <p className="text-hibernating mt-3 text-xs">
          {lifeline === null
            ? t.counter.lifelineNone
            : `${t.counter.lifelineLast.replace("{row}", String(lifeline))} · ${t.counter.lifelineUnravel.replace(
                "{n}",
                String(rowsToUnravel(selected?.value ?? 0, lifeline))
              )}`}
        </p>
      </section>

      {/* --- 큰 +1 영역 ---
          연동 카운터는 메인에서 파생되므로 직접 세지 않는다. 버튼을 비활성으로
          두는 대신 왜 못 누르는지를 그 자리에 적는다. */}
      {linked ? (
        <div className="border-border text-text-muted mx-3 flex flex-1 items-center justify-center rounded-3xl border border-dashed px-8 text-center text-sm">
          {t.counter.linkedReadOnly
            .replace("{main}", mainCounter?.label ?? "")
            .replace("{ratio}", String(selected?.linkRatio ?? 0))}
        </div>
      ) : (
        <button
          type="button"
          aria-label="+1"
          onClick={() => void doStep(1)}
          className="bg-accent text-accent-fg mx-3 flex flex-1 items-center justify-center rounded-3xl active:brightness-95"
        >
          <Plus size={72} strokeWidth={2.5} />
        </button>
      )}

      {/* --- 보조 조작 --- */}
      <nav className="flex items-center justify-around gap-2 px-3 py-3">
        <SmallAction
          icon={<Undo2 size={20} />}
          label={t.counter.undo}
          disabled={undoStack.length === 0}
          onClick={() => void undo()}
        />
        <SmallAction
          icon={<Minus size={20} />}
          label="−1"
          disabled={linked || (selected?.value ?? 0) === 0}
          onClick={() => void doStep(-1)}
        />
        <SmallAction
          icon={<LifeBuoy size={20} />}
          label={t.counter.lifelineHere}
          onClick={() => {
            if (!activeId) return;
            void addMark(activeId, selected?.value ?? 0, "lifeline");
            haptic([10, 30, 10]);
          }}
        />
      </nav>

      {sessionRows > 0 && (
        <p className="text-text-muted pb-2 text-center text-xs">
          {t.counter.sessionRows.replace("{n}", String(sessionRows))}
        </p>
      )}
    </div>
  );
}

function SmallAction({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="bg-surface-muted text-text-muted flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-xl disabled:opacity-30"
    >
      {icon}
      <span className="text-[11px]">{label}</span>
    </button>
  );
}

function EmptyKnit({ onLeave }: { onLeave: () => void }) {
  const t = useStrings();
  return (
    <div className="pt-safe flex h-dvh flex-col items-center justify-center gap-3 px-8 text-center">
      <p className="text-text-muted">{t.counter.empty}</p>
      <p className="text-text-muted/70 text-sm">{t.counter.emptyHint}</p>
      <button
        type="button"
        onClick={onLeave}
        className="bg-surface-muted mt-2 rounded-xl px-4 py-2.5 text-sm"
      >
        {t.action.back}
      </button>
    </div>
  );
}
