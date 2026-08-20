/**
 * 완성 예상일 — 기획 §3.10-4.
 *
 * "언제 끝날까"는 뜨개에서 위험한 질문이다. 재촉으로 읽히면 이 앱의 전제
 * (중단은 실패가 아니다)와 정면으로 부딪친다. 그래서 여기 계산은 **재촉이
 * 아니라 계획**을 위한 것이다 — 선물 마감이 있는 사람이 "이 속도로는 안
 * 되겠다"를 미리 알아야 실을 더 사거나 크기를 줄일 수 있다.
 *
 * 그 목적 때문에 모델을 낙관적으로 잡지 않는다. 흔한 실수는 "뜬 날의 평균"을
 * 쓰는 것이다. 30일 중 3일만 떴는데 그 3일 평균으로 나누면 쉬는 날이 사라져
 * 예상일이 실제의 1/10로 나온다. 여기서는 **관측 기간의 달력 일수**로 나눈다 —
 * 쉬는 날도 그 사람의 속도다.
 *
 * 시각은 인자로 받는다. 도메인이 시계를 직접 읽으면 테스트가 시계에 묶인다.
 */

import { hoursRemaining, rowsPerHour, usableSessions } from "./counter";
import type { SessionLike } from "./stats";

export interface FinishForecast {
  /** 시간당 단수 */
  perHour: number;
  /** 남은 단수를 뜨는 데 필요한 시간 */
  hoursLeft: number;
  /** 관측 기간 동안 하루에 뜬 시간 (쉬는 날 포함) */
  hoursPerDay: number;
  /** 남은 날수 */
  daysLeft: number;
  /** 예상 완성일 — 로컬 자정 기준 */
  at: Date;
  /**
   * 근거가 얇다. 세션이 적거나 관측 기간이 짧으면 하루 평균이 우연에
   * 가까워진다. 숫자를 감추는 대신 얼마나 믿을지를 화면에 넘긴다.
   */
  thin: boolean;
}

/** 근거를 신뢰하기 위한 최소 세션 수 */
const ENOUGH_SESSIONS = 3;
/** 근거를 신뢰하기 위한 최소 관측 일수 */
const ENOUGH_DAYS = 3;

const midnight = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/** 끝난 세션만 시간을 셀 수 있다 — 진행 중인 세션은 길이가 없다. */
const durationOf = (s: SessionLike) =>
  s.endedAt ? s.endedAt.getTime() - s.startedAt.getTime() : 0;

/**
 * 세션 기록으로 남은 단수의 완성 예상일을 낸다.
 *
 * 근거가 없으면 `null`이다 — 목표가 없거나(남은 단수를 모른다), 쓸 만한
 * 세션이 없거나(속도를 모른다). 추측한 기본값을 넣지 않는다. 없는 근거로
 * 낸 날짜는 틀린 날짜이고, 틀린 날짜는 없는 날짜보다 나쁘다.
 */
export function finishForecast(
  sessions: SessionLike[],
  remainingRows: number,
  now: Date
): FinishForecast | null {
  if (remainingRows <= 0) return null;

  const usable = usableSessions(
    sessions.map((s) => ({
      rowsAdded: Math.max(0, s.rowsAdded),
      durationMs: Math.max(0, durationOf(s)),
      startedAt: s.startedAt,
    }))
  );

  const perHour = rowsPerHour(usable);
  const hoursLeft = hoursRemaining(remainingRows, perHour);
  if (perHour === null || hoursLeft === null) return null;

  const totalHours =
    usable.reduce((sum, s) => sum + s.durationMs, 0) / 3_600_000;

  // 관측 기간 — 첫 세션부터 마지막 세션까지의 달력 일수(양끝 포함).
  const times = usable.map((s) => midnight(s.startedAt).getTime());
  const spanDays =
    Math.round((Math.max(...times) - Math.min(...times)) / 86_400_000) + 1;

  const hoursPerDay = totalHours / spanDays;
  if (hoursPerDay <= 0) return null;

  const daysLeft = Math.ceil(hoursLeft / hoursPerDay);
  const at = midnight(now);
  at.setDate(at.getDate() + daysLeft);

  return {
    perHour,
    hoursLeft,
    hoursPerDay,
    daysLeft,
    at,
    thin: usable.length < ENOUGH_SESSIONS || spanDays < ENOUGH_DAYS,
  };
}
