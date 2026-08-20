/**
 * 카운터 계산.
 *
 * 뜨는 동안 실제로 손에 쥐고 쓰는 화면의 두뇌. 여기서 틀리면 사용자는
 * 몇 시간 뜬 것을 풀어야 하므로 UI와 분리해 순수 함수로 두고 테스트한다.
 *
 * 설계에서 중요한 결정 하나: **연동 카운터는 저장된 값을 증감시키지 않고
 * 메인 값에서 매번 파생시킨다.** 증감식으로 두면 실행취소·직접수정·앱 종료가
 * 겹칠 때 메인과 서브가 어긋나고, 한번 어긋나면 사용자는 알아채지 못한다.
 * 파생식이면 어긋날 수가 없다.
 */

export interface CounterSpec {
  value: number;
  target?: number;
  /** 무늬 반복 길이. "12단 무늬"의 12. */
  repeatLength?: number;
  /** 목표 반복 횟수. "× 5회"의 5. */
  repeatTarget?: number;
  /** 이 카운터가 따라가는 메인 카운터 */
  linkedCounterId?: string;
  /** 메인이 이만큼 오를 때마다 1 오른다 */
  linkRatio?: number;
  /** 연동 카운터의 시작값 보정 (도중에 붙였을 때) */
  linkOffset?: number;
}

/* --- 파생 값 -------------------------------------------------------------- */

export interface RepeatView {
  /** 완료한 반복 횟수 */
  completed: number;
  /** 현재 반복 안에서 뜬 단수 */
  rowInRepeat: number;
  length: number;
  target?: number;
}

export interface CounterView {
  value: number;
  target?: number;
  /** 목표까지 남은 단수. 목표가 없으면 undefined. */
  remaining?: number;
  /** 0~1. 목표가 없으면 undefined. */
  progress?: number;
  repeat?: RepeatView;
  /** 목표에 도달했는가 */
  done: boolean;
}

export function counterView(spec: CounterSpec): CounterView {
  const value = Math.max(0, Math.floor(spec.value));
  const view: CounterView = { value, done: false };

  if (spec.target && spec.target > 0) {
    view.target = spec.target;
    view.remaining = Math.max(0, spec.target - value);
    // 목표를 넘겨도 진행률은 100%에서 멈춘다 — 막대가 넘치면 읽기 어렵다
    view.progress = Math.min(1, value / spec.target);
    view.done = value >= spec.target;
  }

  if (spec.repeatLength && spec.repeatLength > 0) {
    const length = spec.repeatLength;
    view.repeat = {
      length,
      completed: Math.floor(value / length),
      rowInRepeat: value % length,
      target: spec.repeatTarget,
    };
    // 목표 단수가 없고 반복 목표만 있으면 그쪽으로 완료를 판정한다
    if (!spec.target && spec.repeatTarget) {
      view.done = view.repeat.completed >= spec.repeatTarget;
    }
  }

  return view;
}

/** 반복 목표까지 남은 단수. 목표 반복이 없으면 null. */
export function rowsUntilRepeatTarget(spec: CounterSpec): number | null {
  if (!spec.repeatLength || !spec.repeatTarget) return null;
  const total = spec.repeatLength * spec.repeatTarget;
  return Math.max(0, total - Math.max(0, spec.value));
}

/* --- 연동 카운터 ---------------------------------------------------------- */

/**
 * 메인 값에서 연동 카운터 값을 파생시킨다.
 *
 * 예) 메인 8단마다 1회 → ratio 8. 메인 24단이면 연동은 3.
 */
export function derivedLinkedValue(
  mainValue: number,
  ratio: number,
  offset = 0
): number {
  if (ratio <= 0) return offset;
  return offset + Math.floor(Math.max(0, mainValue) / ratio);
}

/* --- 증감 ----------------------------------------------------------------- */

export interface CounterRecord extends CounterSpec {
  id: string;
}

/** 카운터 하나를 증감한 결과 값. 0 밑으로는 내려가지 않는다. */
export const stepValue = (value: number, delta: number) =>
  Math.max(0, Math.floor(value) + delta);

/**
 * 한 카운터를 증감하면서, 이 카운터를 따라가는 연동 카운터들도 함께 갱신한다.
 *
 * 반환값은 실제로 값이 바뀐 카운터만 담는다 — 바뀌지 않은 것까지 쓰면
 * 오프라인 저장이 불필요하게 커진다.
 */
/** 연동 카운터인가 — 값이 메인에서 파생되므로 직접 증감할 수 없다 */
export const isLinked = (spec: CounterSpec) =>
  Boolean(spec.linkedCounterId && spec.linkRatio && spec.linkRatio > 0);

export function applyStep(
  counters: CounterRecord[],
  targetId: string,
  delta: number
): { id: string; value: number }[] {
  const target = counters.find((c) => c.id === targetId);
  if (!target) return [];

  // 연동 카운터를 직접 올리면 메인과 어긋난 값이 되고, 다음 재조정 때
  // 조용히 되돌아간다. 사용자는 값을 잃은 이유를 알 수 없다. 그래서 막는다.
  if (isLinked(target)) return [];

  const nextValue = stepValue(target.value, delta);
  if (nextValue === target.value) return [];

  const updates = [{ id: targetId, value: nextValue }];

  for (const counter of counters) {
    if (counter.linkedCounterId !== targetId || !counter.linkRatio) continue;
    const derived = derivedLinkedValue(
      nextValue,
      counter.linkRatio,
      counter.linkOffset ?? 0
    );
    if (derived !== counter.value) {
      updates.push({ id: counter.id, value: derived });
    }
  }

  return updates;
}

/**
 * 연동 카운터 전체를 메인 기준으로 다시 맞춘다.
 *
 * 앱을 오래 껐다 켜거나 값을 직접 고친 뒤에 부른다.
 * 파생식이므로 언제 불러도 결과가 같다.
 */
export function reconcileLinked(
  counters: CounterRecord[]
): { id: string; value: number }[] {
  const byId = new Map(counters.map((c) => [c.id, c]));
  const updates: { id: string; value: number }[] = [];

  for (const counter of counters) {
    if (!counter.linkedCounterId || !counter.linkRatio) continue;
    const main = byId.get(counter.linkedCounterId);
    if (!main) continue;
    const derived = derivedLinkedValue(
      main.value,
      counter.linkRatio,
      counter.linkOffset ?? 0
    );
    if (derived !== counter.value)
      updates.push({ id: counter.id, value: derived });
  }

  return updates;
}

/* --- Lifeline ------------------------------------------------------------- */

/* --- 구성 복제 ------------------------------------------------------------ */

export interface CounterLayout {
  id: string;
  label: string;
  sortOrder: number;
  target?: number;
  repeatLength?: number;
  repeatTarget?: number;
  linkedCounterId?: string;
  linkRatio?: number;
}

/** 새 프로젝트에 그대로 만들 수 있는 카운터 설계도. 참조는 id가 아니라 순번이다. */
export interface CounterBlueprint {
  label: string;
  target?: number;
  repeatLength?: number;
  repeatTarget?: number;
  /** 따라갈 카운터의 배열 순번. 없으면 연동 없음. */
  linkedIndex?: number;
  linkRatio?: number;
}

/**
 * 카운터 구성을 다른 프로젝트로 옮길 형태로 바꾼다.
 *
 * 같은 작품을 다른 실로 다시 뜰 때 쓴다(기획 §3.1 — 같은 옷을 두 번 뜨는 건
 * 뜨개에서 흔한 일이다). id를 그대로 복사하면 새 카운터가 옛 프로젝트의
 * 카운터를 따라가버리므로, 참조를 **배열 순번으로 바꿔서** 넘긴다. 저장
 * 계층이 새 id를 만든 뒤 순번으로 다시 이어붙인다.
 *
 * 값(value)과 linkOffset은 옮기지 않는다. 새로 뜨는 것이므로 0단에서
 * 시작하고, offset은 "도중에 연동을 붙였을 때의 보정"이라 처음부터 다시
 * 뜨는 카운터에는 의미가 없다.
 */
export function counterBlueprints(
  counters: CounterLayout[]
): CounterBlueprint[] {
  const ordered = [...counters].sort((a, b) => a.sortOrder - b.sortOrder);
  const indexById = new Map(ordered.map((c, i) => [c.id, i]));

  return ordered.map((counter) => {
    const linkedIndex =
      counter.linkedCounterId === undefined
        ? undefined
        : indexById.get(counter.linkedCounterId);

    // 따라가던 카운터가 목록에 없으면(지워졌거나 다른 프로젝트) 연동을 버린다.
    // 유령 참조를 옮기면 새 카운터가 영원히 0에 멈춘다.
    const linked = linkedIndex !== undefined && counter.linkRatio;

    return {
      label: counter.label,
      target: counter.target,
      repeatLength: counter.repeatLength,
      repeatTarget: counter.repeatTarget,
      linkedIndex: linked ? linkedIndex : undefined,
      linkRatio: linked ? counter.linkRatio : undefined,
    };
  });
}

/**
 * 현재 단수 기준으로 가장 가까운 아래쪽 생명줄을 찾는다.
 *
 * 실수했을 때 "여기까지만 풀면 된다"를 말해주는 값이다.
 * 이 서비스의 "멈춰도 안전하다"는 태도가 기능이 된 지점.
 */
export function lastLifelineBelow(
  value: number,
  lifelineRows: number[]
): number | null {
  const below = lifelineRows.filter((row) => row <= value);
  return below.length > 0 ? Math.max(...below) : null;
}

/** 생명줄까지 풀어야 할 단수 */
export function rowsToUnravel(value: number, lifelineRow: number): number {
  return Math.max(0, value - lifelineRow);
}

/* --- 속도 · 예상 ---------------------------------------------------------- */

export interface SessionSummary {
  rowsAdded: number;
  /** 밀리초 */
  durationMs: number;
}

/**
 * 속도 계산에 쓸 수 있는 세션의 최소 길이(밀리초).
 *
 * 앱을 켰다 바로 끈 기록이 섞이면 시간당 단수가 실제보다 크게 튄다.
 */
export const USABLE_SESSION_MS = 60_000;

/**
 * 속도 계산에 쓸 세션만 남긴다.
 *
 * 시간당 단수와 완성 예상일이 **같은 집합**을 봐야 한다. 각자 거르면
 * "시간당 20단"과 그 예상일의 근거가 달라지고, 그 어긋남은 화면에
 * 드러나지 않는다.
 */
export const usableSessions = <T extends SessionSummary>(sessions: T[]): T[] =>
  sessions.filter((s) => s.durationMs >= USABLE_SESSION_MS && s.rowsAdded > 0);

/**
 * 세션 기록에서 시간당 단수를 구한다.
 *
 * 완성 예상일(기획 §3.10-4)의 입력. 너무 짧은 세션은 노이즈라 버린다.
 */
export function rowsPerHour(sessions: SessionSummary[]): number | null {
  const usable = usableSessions(sessions);
  if (usable.length === 0) return null;

  const rows = usable.reduce((sum, s) => sum + s.rowsAdded, 0);
  const hours = usable.reduce((sum, s) => sum + s.durationMs, 0) / 3_600_000;
  return hours > 0 ? rows / hours : null;
}

/** 남은 단수를 지금 속도로 뜨는 데 걸리는 시간(시간 단위) */
export function hoursRemaining(
  remainingRows: number,
  perHour: number | null
): number | null {
  if (!perHour || perHour <= 0) return null;
  return remainingRows / perHour;
}
