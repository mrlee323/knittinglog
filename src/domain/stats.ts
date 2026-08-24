/**
 * 통계 집계.
 *
 * 대시보드의 첫 번째 임무는 자랑이 아니라 **가시성**이다. 몇 개가 멈춰 있는지
 * 조차 파악이 안 되는 게 중단의 원인 중 하나였다(기획 §1). 그래서 여기 계산은
 * "얼마나 많이 떴나"보다 "지금 무엇이 어디에 있나"에 무게를 둔다.
 *
 * 시각은 전부 인자로 받는다. 도메인이 현재 시각을 직접 읽으면 테스트가
 * 시계에 의존하게 된다.
 */

import type { PauseReason, ProjectStatus } from "@/types/entities";

/* --- 날짜 키 -------------------------------------------------------------- */

/**
 * 로컬 기준 날짜 키(`YYYY-MM-DD`).
 *
 * `toISOString()`을 쓰면 UTC 기준으로 잘려서 한국 시간 오전 9시 이전에 뜬 것이
 * 전날로 밀린다. 밤에 뜨는 사람이 많은 앱에서 이건 흔하게 틀리는 자리다.
 */
export function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 로컬 자정 기준으로 n일 전 */
export function daysAgo(now: Date, n: number): Date {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - n);
  return date;
}

/* --- 세션 집계 ------------------------------------------------------------ */

export interface SessionLike {
  startedAt: Date;
  endedAt?: Date;
  rowsAdded: number;
}

export interface SessionTotals {
  rows: number;
  /** 밀리초 */
  durationMs: number;
  /** 실제로 뜬 날의 수 */
  days: number;
}

/** 끝나지 않은 세션은 시간을 셀 수 없다 — 단수만 센다. */
const durationOf = (session: SessionLike) =>
  session.endedAt ? session.endedAt.getTime() - session.startedAt.getTime() : 0;

export function aggregateSessions(sessions: SessionLike[]): SessionTotals {
  const days = new Set<string>();
  let rows = 0;
  let durationMs = 0;

  for (const session of sessions) {
    rows += Math.max(0, session.rowsAdded);
    durationMs += Math.max(0, durationOf(session));
    days.add(localDateKey(session.startedAt));
  }

  return { rows, durationMs, days: days.size };
}

export const sessionsSince = (sessions: SessionLike[], from: Date) =>
  sessions.filter((s) => s.startedAt.getTime() >= from.getTime());

/** 날짜별 단수. 잔디 히트맵(P1)과 "이번 주" 집계가 같은 값을 쓴다. */
export function rowsByDate(sessions: SessionLike[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const session of sessions) {
    const key = localDateKey(session.startedAt);
    map.set(key, (map.get(key) ?? 0) + Math.max(0, session.rowsAdded));
  }
  return map;
}

/**
 * 연속으로 뜬 일수.
 *
 * 오늘 아직 안 떴어도 어제까지 이어졌으면 끊긴 게 아니다 — 하루는 아직 남았다.
 * 오늘을 기준으로 끊어버리면 아침에 앱을 열 때마다 기록이 0으로 보인다.
 */
export function currentStreak(sessions: SessionLike[], now: Date): number {
  const days = new Set([...rowsByDate(sessions).keys()]);
  if (days.size === 0) return 0;

  const todayKey = localDateKey(now);
  const yesterdayKey = localDateKey(daysAgo(now, 1));
  if (!days.has(todayKey) && !days.has(yesterdayKey)) return 0;

  let streak = 0;
  let offset = days.has(todayKey) ? 0 : 1;
  while (days.has(localDateKey(daysAgo(now, offset)))) {
    streak += 1;
    offset += 1;
  }
  return streak;
}

/* --- 프로젝트 현황 -------------------------------------------------------- */

export interface ProjectLike {
  id: string;
  status: ProjectStatus;
  updatedAt: Date;
  pausedAt?: Date;
  finishedAt?: Date;
  pauseReason?: PauseReason;
}

export type StatusCounts = Record<ProjectStatus, number>;

export function countByStatus(projects: ProjectLike[]): StatusCounts {
  const counts: StatusCounts = {
    planning: 0,
    active: 0,
    hibernating: 0,
    finished: 0,
    frogged: 0,
  };
  // 낯선 상태는 세지 않는다. undefined + 1은 NaN이고, 그러면 이 항목만
  // 틀리는 게 아니라 합계가 전부 무너진다.
  for (const project of projects) {
    if (project.status in counts) counts[project.status] += 1;
  }
  return counts;
}

/**
 * 이어서 뜰 프로젝트.
 *
 * 가장 최근에 손댄 진행중 프로젝트. 대시보드에서 뜨기 모드까지 한 번에
 * 가기 위한 것이고, 없으면 null을 돌려준다(억지로 뭔가 보여주지 않는다).
 */
export function resumeCandidate<T extends ProjectLike>(
  projects: T[]
): T | null {
  const active = projects.filter((p) => p.status === "active");
  if (active.length === 0) return null;
  return active.reduce((latest, p) =>
    p.updatedAt.getTime() > latest.updatedAt.getTime() ? p : latest
  );
}

/**
 * 오래 멈춘 것부터.
 *
 * 죄책감을 주려는 목록이 아니다. 멈춘 게 보이지 않아서 잊히는 걸 막는 목록이다.
 * pausedAt이 없는 잠시멈춤은 순서를 정할 근거가 없으므로 뒤로 보낸다.
 */
export function longestPaused<T extends ProjectLike>(
  projects: T[],
  limit = 3
): T[] {
  return projects
    .filter((p) => p.status === "hibernating")
    .sort((a, b) => {
      const aTime = a.pausedAt?.getTime() ?? Infinity;
      const bTime = b.pausedAt?.getTime() ?? Infinity;
      return aTime - bTime;
    })
    .slice(0, limit);
}

/* --- 표시 보조 ------------------------------------------------------------ */

/** 시간을 시·분으로 쪼갠다. 초는 뜨개에서 의미가 없다. */
export function splitDuration(ms: number): { hours: number; minutes: number } {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}

/* --- 잔디 히트맵 ---------------------------------------------------------- */

export interface HeatCell {
  /** `YYYY-MM-DD` */
  key: string;
  rows: number;
  /** 0은 안 뜬 날. 1~4는 자기 기록 안에서의 상대 강도. */
  level: 0 | 1 | 2 | 3 | 4;
  /** 0=일요일. 주 단위 격자로 쌓을 때 첫 주를 밀어주는 데 쓴다. */
  weekday: number;
}

/* --- 실 소비량 ------------------------------------------------------------ */

export interface YarnUse {
  skeins: number;
  /** 타래 스펙을 아는 것만 합산한다 */
  grams: number;
  meters: number;
}

/* --- 중단 이력 ------------------------------------------------------------ */

export interface PauseRecord {
  reason: PauseReason;
  pausedAt: Date;
  endedAt?: Date;
  endedBy?: "resumed" | "finished" | "frogged";
}

export interface ReasonOutcome {
  reason: PauseReason;
  /** 이 사유로 멈춘 횟수 (평생) */
  total: number;
  /** 그중 다시 뜨기로 돌아온 횟수 */
  resumed: number;
  /** 아직 멈춰 있는 횟수 */
  open: number;
}

/**
 * 사유별 중단 횟수와 결말.
 *
 * `pauseReasonBreakdown`과 다른 것은 **평생 이력을 센다**는 점이다. 프로젝트의
 * pauseReason은 재개하면 지워지므로 현재 상태만으로는 "주로 무엇 때문에
 * 멈추는가"를 알 수 없다.
 *
 * 횟수보다 `resumed`가 더 쓸모 있다. 자주 멈추지만 늘 돌아오는 사유와, 한 번
 * 멈추면 다시 안 돌아오는 사유는 사용자가 대응해야 할 방식이 다르다.
 */
export function reasonOutcomes(events: PauseRecord[]): ReasonOutcome[] {
  const map = new Map<PauseReason, ReasonOutcome>();

  for (const event of events) {
    const entry = map.get(event.reason) ?? {
      reason: event.reason,
      total: 0,
      resumed: 0,
      open: 0,
    };
    entry.total += 1;
    if (event.endedBy === "resumed") entry.resumed += 1;
    if (!event.endedAt) entry.open += 1;
    map.set(event.reason, entry);
  }

  return [...map.values()].sort((a, b) => b.total - a.total);
}

/**
 * 멈춰 있던 기간의 중앙값(일).
 *
 * 평균이 아니라 중앙값을 쓴다. 한 번 2년을 방치하면 평균이 그쪽으로 끌려가서
 * "보통 얼마나 멈추는가"를 말하지 못한다.
 *
 * 아직 멈춰 있는 것은 지금까지의 기간으로 센다 — 진행 중인 방치를 빼면
 * 가장 오래 멈춘 것들이 통계에서 사라진다.
 */
export function medianPauseDays(
  events: PauseRecord[],
  now: Date
): number | null {
  if (events.length === 0) return null;

  const spans = events
    .map((e) => {
      const end = e.endedAt ?? now;
      return Math.max(
        0,
        Math.floor((end.getTime() - e.pausedAt.getTime()) / 86_400_000)
      );
    })
    .sort((a, b) => a - b);

  const mid = Math.floor(spans.length / 2);
  return spans.length % 2 === 1
    ? spans[mid]
    : Math.round((spans[mid - 1] + spans[mid]) / 2);
}
