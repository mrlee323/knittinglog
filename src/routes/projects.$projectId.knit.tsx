import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Columns2,
  LifeBuoy,
  Plus,
  Minus,
  Undo2,
  X,
  Sun,
  SunDim,
} from "lucide-react";
import { counterView, isLinked } from "@/domain/counter";
import { LifelineNote } from "@/features/counter/components/lifeline-note";
import { RepeatLine } from "@/features/counter/components/repeat-line";
import { haptic, useWakeLock } from "@/hooks/useWakeLock";
import {
  addMark,
  createCounter,
  endSession,
  lifelineRows,
  listCounters,
  reconcileProject,
  restoreValues,
  startSession,
  step,
} from "@/features/counter/repository";
import { getProject } from "@/features/project/repository";
import { KnitPanel } from "@/features/reference/components/knit-panel";
import { useWorkbenchItems } from "@/features/reference/items";
import { SplitPane } from "@/components/ui/split-pane";
import { useStrings } from "@/i18n";
import { useShortViewport, useWideEnough } from "@/lib/use-media-query";
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
  /**
   * 도안 패널.
   *
   * 기본은 열어둔다 — 넓은 화면에서 뜨기 화면에 들어오는 사람은 대개 도안을
   * 보며 뜬다. 폰에서는 CSS가 아예 감추므로 이 값이 영향을 주지 않는다.
   */
  const wide = useWideEnough();
  // 분할 화면(유튜브를 위에, 우리를 아래에)에서 참이 된다
  const short = useShortViewport();
  /**
   * 도안을 펼친 채로 시작할지.
   *
   * **좁고 낮은 창에서는 접은 채로 연다.** 400px 높이를 둘로 쪼개면 도안도
   * 카운터도 못 쓰는 크기가 된다 — 분할 화면에서 우리 창이 그 꼴이 된다.
   * 그때 필요한 건 셀 수 있는 카운터이고, 도안은 버튼으로 열면 된다.
   */
  const [showPattern, setShowPattern] = useState(() => !(short && !wide));

  /*
    화면 꺼짐 방지는 **끌 수 있어야 한다**(012).

    전에는 켜진 채로 고정이었고, 켜졌을 때만 작은 해 아이콘이 떴다. 그러면
    **안 켜진 경우에 화면이 아무 말도 안 한다** — 배터리 절약 모드나 잠금을
    지원하지 않는 브라우저에서 거부되면 사용자는 왜 화면이 꺼지는지 알 길이
    없고, 할 수 있는 것도 없다.

    지금은 언제나 단추가 있고 상태를 말한다. 끄고 싶은 경우도 있다 — 배터리가
    얼마 없는데 도안만 잠깐 보려는 때다.
  */
  const [wantScreenOn, setWantScreenOn] = useState(true);
  const screenOn = useWakeLock(wantScreenOn);

  /*
    **볼 도안이 없으면 나누지 않는다**(012).

    전에는 올려둔 것이 없어도 화면을 갈라 그 칸에 "작업대에 도안이나 참고
    자료를 올려두면…" 한 줄을 띄웠다. 폰에서 그 칸이 **화면의 38%**였다 —
    아무것도 없다는 말이 카운터보다 넓은 자리를 차지했다.

    지워서 해결한다. 안내문을 줄이는 게 아니라 아예 안 그린다(007·009의 규칙과
    같다). 올리는 길은 프로젝트의 `작업대` 탭과 개요의 `참고 자료`에 있고,
    **뜨는 중에 할 일이 아니다** — 손이 실에 묶여 있다.
  */
  const workbench = useWorkbenchItems(projectId);
  const hasPattern = workbench.items.length > 0;

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
        projectId={projectId}
        onLeave={() =>
          navigate({ to: "/projects/$projectId", params: { projectId } })
        }
      />
    );
  }

  const view = selected ? counterView(selected) : null;
  const linked = selected ? isLinked(selected) : false;
  const mainCounter = counters.find((c) => c.id === selected?.linkedCounterId);

  /**
   * 나누지 않고 **바꿔** 보여줄지.
   *
   * 400px 높이를 둘로 쪼개면 도안도 카운터도 못 쓰는 크기가 된다 — 비율을
   * 어떻게 잡아도 그렇다. 그럴 때는 나누지 말고 하나만 보여주는 게 맞다.
   * 흘끗 도안을 보고, 돌아와서 센다.
   */
  const swap = short && !wide;

  /** 볼 것이 있고, 접지 않았을 때만 나눈다(012). */
  const splitting = hasPattern && showPattern;

  /*
    카운터 칸이 **화면 전체가 아닐 때**는 숫자를 줄인다(012).

    전에는 낮은 창(`short`)만 기준이었다. 그런데 812px짜리 폰은 `short`가
    아니면서 도안을 켜면 카운터가 화면의 62%만 받는다 — 거기에 13vh 숫자를
    넣으면 `+1`과 보조 조작이 **화면 밖으로 밀린다.** 실제로 그렇게 됐다.

    기준은 창 높이가 아니라 **이 칸이 화면을 다 쓰는가**다.
  */
  const tight = short || splitting;

  /**
   * 상단 바는 분할 **바깥**에 둔다.
   *
   * 처음에는 카운터 열 안에 있었는데, 바꿔 보여주기 모드에서 도안을 열면
   * 카운터가 렌더되지 않으므로 나가는 문과 도안 토글이 함께 사라졌다 — 갇힌다.
   * 이 바는 카운터의 것이 아니라 뜨기 모드 전체의 것이다.
   */
  const topBar = (
    <header className="flex items-center gap-2 px-3 py-2">
      <button
        type="button"
        aria-label={t.action.back}
        onClick={() =>
          navigate({ to: "/projects/$projectId", params: { projectId } })
        }
        /* 손에 실을 쥔 채 누른다 — 44px은 이 앱의 바닥이다(012). p-2는
           34~38px이라 상단 바만 그 바닥 아래였다. */
        className="text-text-2 flex size-11 items-center justify-center rounded-md"
      >
        <X size={22} />
      </button>
      {/* 이름도 누르면 나간다. X 하나만 두면 나가는 길이 한 곳이라
          손이 닿는 자리에서 벗어난다. */}
      <button
        type="button"
        onClick={() =>
          navigate({ to: "/projects/$projectId", params: { projectId } })
        }
        className="text-text-2 text-small min-w-0 flex-1 truncate text-left"
      >
        {project.name}
      </button>
      <button
        type="button"
        aria-pressed={wantScreenOn}
        aria-label={t.counter.screenOn}
        title={t.counter.screenOn}
        onClick={() => setWantScreenOn((v) => !v)}
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-md transition",
          screenOn ? "text-accent" : "text-text-3"
        )}
      >
        {screenOn ? <Sun size={18} /> : <SunDim size={18} />}
      </button>
      {/* 도안 접기는 **볼 것이 있을 때만** 둔다(012). 아무것도 없는데 단추를
          두면 눌러도 빈 칸이 열릴 뿐이다. 폰에서도 도안을 보며 뜨는 것이
          기본이고, 무늬가 외워지면 접어 숫자만 크게 본다. */}
      {hasPattern && (
        <button
          type="button"
          aria-pressed={showPattern}
          aria-label={t.counter.patternPanel}
          title={t.counter.patternPanel}
          onClick={() => setShowPattern((v) => !v)}
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-md transition",
            showPattern ? "text-accent" : "text-text-2"
          )}
        >
          <Columns2 size={18} />
        </button>
      )}
    </header>
  );

  const counterPane = (
    // 숫자 영역이 넘치면 그 안에서 스크롤되게 두고 +1·보조 조작은 자리를
    // 지킨다. 자리가 모자랄 때 밀려나야 하는 것은 읽는 정보이고, 마지막까지
    // 남아야 하는 것은 누르는 자리다.
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {counters.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-3 pb-2">
          {counters.map((counter) => (
            <button
              key={counter.id}
              type="button"
              onClick={() => setSelectedId(counter.id)}
              aria-pressed={counter.id === activeId}
              className={cn(
                "text-small shrink-0 rounded-sm px-2.5 py-1.5 transition",
                counter.id === activeId
                  ? "bg-accent text-on-accent font-medium"
                  : "bg-sunken text-text-2"
              )}
            >
              {counter.label} {counter.value}
            </button>
          ))}
        </div>
      )}

      {/* --- 숫자 ---
        **자리가 모자라면 여기가 양보한다**(012). 전에는 `shrink-0`이라
        아무것도 줄지 않았고, 모자란 만큼 **`+1`과 보조 조작이 아래로 잘렸다**
        (SE에서 도안을 켜면 16px). 밀려나야 하는 것은 읽는 정보이고 마지막까지
        남아야 하는 것은 누르는 자리인데 — 이 칸의 원래 주석이 그렇게 적혀
        있었고 클래스가 반대였다. */}
      <section
        className={cn(
          "min-h-0 shrink overflow-y-auto text-center",
          // 분할 화면에서는 숫자가 화면을 다 먹어 +1 영역이 밀려난다.
          // 세는 데 필요한 것은 큰 숫자보다 누를 수 있는 자리다.
          tight ? "px-4 pt-1 pb-2" : "px-5 pt-2 pb-4"
        )}
      >
        <p className="text-text-2 text-small">{selected?.label}</p>
        {/*
          **화면 높이로 잰다**(012). 전에는 72px 고정이라 아이패드(1180px)에서
          화면의 6.1%, SE(667px)에서 10.8%였다 — 같은 숫자가 큰 화면일수록
          작아 보였다. 뜨면서 팔 길이에서 흘끗 보는 숫자라 절대 크기보다
          **화면에서 차지하는 자리**가 기준이다.

          `clamp`의 양끝이 보장이다. 아주 낮은 창에서도 읽히는 밑값과, 아주
          큰 화면에서 한 화면을 먹지 않는 윗값.
        */}
        <p
          className={cn(
            "leading-none font-semibold tracking-tight tabular-nums",
            tight
              ? "text-[clamp(2.75rem,8vh,4.5rem)]"
              : "text-[clamp(4rem,13vh,9rem)]"
          )}
        >
          {view?.value ?? 0}
        </p>

        {view?.target && (
          <>
            {/* 72px 숫자 옆에서 13px 목표는 각주로 읽힌다(010). 상세의 34/20
                비율에 맞춰 키운다 — 같은 사실이 화면마다 다른 크기면 같은
                앱으로 읽히지 않는다. */}
            <p
              className={cn(
                "text-text-2 mt-1",
                tight ? "text-subhead" : "text-heading"
              )}
            >
              / {view.target}
            </p>
            <div className="bg-sunken mx-auto mt-3 h-1.5 max-w-xs overflow-hidden rounded-full">
              <div
                className="bg-accent h-full rounded-full transition-[width]"
                style={{ width: `${(view.progress ?? 0) * 100}%` }}
              />
            </div>
          </>
        )}

        {/* 남은 단수는 상세와 **같은 크기**여야 한다(010). 여기서만 13px이면
            같은 값이 화면을 옮길 때마다 위계가 달라진다. */}
        <div
          className={cn(
            "text-text-2 space-y-0.5",
            tight ? "text-small mt-1" : "text-subhead mt-3"
          )}
        >
          {view?.remaining !== undefined && !view.done && (
            <p>{t.counter.remaining.replace("{n}", String(view.remaining))}</p>
          )}
          {view?.done && (
            <p className="text-accent font-medium">{t.counter.done}</p>
          )}
          {view?.repeat && <RepeatLine repeat={view.repeat} />}
        </div>

        {/* 라이프라인 — 실수해도 여기까지만 풀면 된다는 안전선 */}
        <LifelineNote
          value={selected?.value ?? 0}
          lifelines={lifelines ?? []}
          className={tight ? "mt-1" : "mt-3"}
        />
      </section>

      {/* --- 큰 +1 영역 ---
        "강조 = 먹색" 규칙을 여기엔 적용하지 않는다. 화면 절반을 먹색으로
        채우면 다크 모드에서 거의 흰 판이 되어, 밤에 뜨는 사람 눈에 조명을
        비추는 꼴이 된다. 대신 낮은 대비의 면 + 테두리로 영역만 알린다.

        **그런데 `bg-sunken`은 아래 보조 단추들과 같은 면이었다**(012). 화면에서
        가장 크고 가장 많이 누르는 자리가 `되돌리기`·`−1`과 **같은 회색**이라,
        커다란 빈 상자로 읽혔다. 띄운다 — 눌리는 것은 올라와 있고 보조 조작은
        파여 있다. 강조색을 쓰지 않고도 둘이 갈린다.

        연동 카운터는 메인에서 파생되므로 직접 세지 않는다. 버튼을 비활성으로
        두는 대신 왜 못 누르는지를 그 자리에 적는다. */}
      {linked ? (
        <div className="border-line text-text-2 text-small mx-3 flex flex-1 items-center justify-center rounded-lg border border-dashed px-8 text-center">
          {t.counter.linkedReadOnly
            .replace("{main}", mainCounter?.label ?? "")
            .replace("{ratio}", String(selected?.linkRatio ?? 0))}
        </div>
      ) : (
        <button
          type="button"
          aria-label="+1"
          onClick={() => void doStep(1)}
          className="bg-surface border-line-strong text-text shadow-raised active:bg-sunken mx-3 flex min-h-24 flex-1 flex-col items-center justify-center gap-1 rounded-lg border transition-[background-color,box-shadow] active:shadow-none"
        >
          {/* 낮은 창에서도 누를 자리는 남아야 한다 — min-h가 그 보장이다 */}
          <Plus size={tight ? 36 : 60} strokeWidth={2} />
          {/* 글자를 같이 둔다. 기호만 있으면 "여기를 누르면 1이 오른다"가
              아니라 "무언가를 추가한다"로도 읽힌다. */}
          {!tight && <span className="text-text-2 text-caption">+1</span>}
        </button>
      )}

      {/* --- 보조 조작 --- */}
      <nav
        className={cn(
          "flex shrink-0 items-center justify-around gap-2 px-3",
          tight ? "py-1" : "py-3"
        )}
      >
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
        <p className="text-text-2 text-caption pb-2 text-center">
          {t.counter.sessionRows.replace("{n}", String(sessionRows))}
        </p>
      )}
    </div>
  );

  return (
    <div className="bg-canvas pt-safe pb-safe flex h-dvh flex-col">
      {topBar}
      {splitting ? (
        <SplitPane
          // 세로 화면에서는 위아래로, 넓은 화면에서는 좌우로 나눈다. 폰에서도
          // 도안이 보여야 한다 — 기획대로면 실사용의 90%가 폰이고, 거기서
          // "도안 보며 뜨기"가 없으면 이 화면의 목적이 절반 사라진다.
          direction={wide ? "row" : "column"}
          // 안전영역은 분할 바깥에 둔다. 카운터 열에만 두면 세로 분할에서
          // 위에 오는 도안이 상태바 밑으로 들어간다.
          className="min-h-0 flex-1"
          label={t.counter.patternPanel}
          // 세로에서는 카운터를 더 크게 준다. +1 영역이 엄지에 닿아야 한다.
          initialRatio={wide ? 45 : 38}
          first={
            <aside
              className={cn(
                "h-full min-h-0 overflow-hidden",
                wide ? "border-line border-r" : "border-line border-b"
              )}
            >
              <KnitPanel projectId={projectId} />
            </aside>
          }
          // 도안을 접으면 카운터가 화면을 다 쓴다. 낮고 좁은 창에서는 애초에
          // 나누지 않으므로 둘째 칸이 없다.
          second={swap ? undefined : counterPane}
        />
      ) : (
        counterPane
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
      className="bg-sunken text-text-2 flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-md disabled:opacity-30"
    >
      {icon}
      {/* 손에 실을 쥔 채 팔 길이에서 누르는 버튼이다. 타깃을 44px로 잡아둔
          것과 같은 이유로 라벨도 micro(11px)에 두지 않는다(010). */}
      <span className="text-caption">{label}</span>
    </button>
  );
}

/**
 * 카운터가 없을 때.
 *
 * 여기서 나가는 길만 주면 막다른 길이다 — 카운터를 만드는 화면은 프로젝트
 * 개요의 **옆 단**에 있고, 폰에서는 페이지 맨 아래라 찾아 내려가야 한다.
 * 뜨려고 들어온 사람에게 필요한 건 지금 셀 수 있는 카운터 하나다.
 */
function EmptyKnit({
  projectId,
  onLeave,
}: {
  projectId: Id;
  onLeave: () => void;
}) {
  const t = useStrings();
  const [making, setMaking] = useState(false);

  return (
    <div className="pt-safe flex h-dvh flex-col items-center justify-center gap-3 px-8 text-center">
      <p className="text-text-2">{t.counter.empty}</p>
      <p className="text-text-3 text-small">{t.counter.emptyHint}</p>
      <button
        type="button"
        disabled={making}
        onClick={async () => {
          setMaking(true);
          try {
            // 이름을 묻지 않는다. 첫 카운터는 거의 늘 단수이고, 이름은 나중에
            // 개요에서 바꿀 수 있다. 뜨려고 들어온 흐름을 끊지 않는 게 낫다.
            await createCounter(projectId, { label: t.counter.defaultLabel });
          } finally {
            setMaking(false);
          }
        }}
        className="bg-accent text-on-accent text-small mt-2 min-h-11 rounded-md px-5 font-medium disabled:opacity-40"
      >
        {t.counter.createDefault}
      </button>
      <button
        type="button"
        onClick={onLeave}
        className="bg-sunken text-small rounded-md px-4 py-2.5"
      >
        {t.action.back}
      </button>
    </div>
  );
}
