/**
 * 프로젝트 상태 머신.
 *
 * 이 서비스의 전제는 "중단은 실패가 아니라 뜨개의 정상 상태"다.
 * 그래서 hibernating(잠시멈춤)은 막다른 상태가 아니라 active와 자유롭게
 * 오갈 수 있는 정상 노드이고, 중단 사유를 함께 기록해 방치 리포트의
 * 재료로 쓴다.
 *
 * 상태 전이는 여기 한 곳에서만 정의한다. UI는 어떤 버튼을 보여줄지
 * `allowedEvents()`에 물어보고, 저장 계층은 `nextStatus()`로 검증한다.
 */

import { createMachine, transition } from "xstate";
import type { PauseReason, ProjectStatus } from "@/types/entities";

export type ProjectEvent =
  | { type: "START" }
  | { type: "PAUSE"; reason: PauseReason; note?: string }
  | { type: "RESUME" }
  | { type: "FINISH" }
  | { type: "FROG" }
  | { type: "REOPEN" }
  | { type: "RESTART" };

export type ProjectEventType = ProjectEvent["type"];

export const projectMachine = createMachine({
  id: "project",
  initial: "planning",
  types: {} as { events: ProjectEvent },
  states: {
    planning: {
      on: { START: "active", FROG: "frogged" },
    },
    active: {
      on: { PAUSE: "hibernating", FINISH: "finished", FROG: "frogged" },
    },
    // 막다른 상태가 아니다. 여기서 돌아오는 것이 이 서비스의 목적이다.
    hibernating: {
      on: { RESUME: "active", FINISH: "finished", FROG: "frogged" },
    },
    finished: {
      // 수선하거나 사이즈를 고치려고 다시 여는 경우가 있다
      on: { REOPEN: "active", FROG: "frogged" },
    },
    frogged: {
      // 풀어버린 실과 도안으로 다시 계획할 수 있다
      on: { RESTART: "planning" },
    },
  },
});

const ALL_EVENTS: ProjectEventType[] = [
  "START",
  "PAUSE",
  "RESUME",
  "FINISH",
  "FROG",
  "REOPEN",
  "RESTART",
];

/** 전이 결과 상태. 허용되지 않는 전이면 현재 상태를 그대로 돌려준다. */
export function nextStatus(
  current: ProjectStatus,
  event: ProjectEvent
): ProjectStatus {
  const snapshot = projectMachine.resolveState({ value: current });
  const [next] = transition(projectMachine, snapshot, event);
  return next.value as ProjectStatus;
}

export function canTransition(
  current: ProjectStatus,
  eventType: ProjectEventType
): boolean {
  // PAUSE는 reason이 필수지만 전이 가능 여부 판정에는 영향이 없다
  const probe = { type: eventType, reason: "other" } as ProjectEvent;
  return nextStatus(current, probe) !== current;
}

/** 현재 상태에서 사용자가 누를 수 있는 버튼 목록 */
export function allowedEvents(current: ProjectStatus): ProjectEventType[] {
  return ALL_EVENTS.filter((e) => canTransition(current, e));
}

/* --- 전이에 따른 날짜 기록 ------------------------------------------------ */

export interface StatusPatch {
  status: ProjectStatus;
  startedAt?: Date;
  pausedAt?: Date;
  finishedAt?: Date;
  pauseReason?: PauseReason;
  pauseNote?: string;
}

/**
 * 전이가 남겨야 할 필드 변화를 계산한다.
 *
 * 복귀 브리핑이 "마지막 작업 4개월 전"을 말하려면 pausedAt이 정확해야 하고,
 * 통계가 소요 기간을 세려면 startedAt이 첫 시작 시점이어야 한다.
 * 그래서 startedAt은 이미 있으면 덮어쓰지 않는다.
 */
export function statusPatch(
  current: { status: ProjectStatus; startedAt?: Date },
  event: ProjectEvent,
  now = new Date()
): StatusPatch | null {
  const status = nextStatus(current.status, event);
  if (status === current.status) return null;

  const patch: StatusPatch = { status };

  switch (event.type) {
    case "START":
    case "RESUME":
    case "REOPEN":
      // 여러 번 멈췄다 재개해도 최초 시작일을 유지한다
      patch.startedAt = current.startedAt ?? now;
      patch.pauseReason = undefined;
      patch.pauseNote = undefined;
      break;
    case "PAUSE":
      patch.pausedAt = now;
      patch.pauseReason = event.reason;
      patch.pauseNote = event.note;
      break;
    case "FINISH":
      patch.finishedAt = now;
      patch.startedAt = current.startedAt ?? now;
      break;
    case "RESTART":
      // 풀고 처음부터 다시 — 날짜를 비운다
      patch.startedAt = undefined;
      patch.pausedAt = undefined;
      patch.finishedAt = undefined;
      patch.pauseReason = undefined;
      patch.pauseNote = undefined;
      break;
    case "FROG":
      break;
  }

  return patch;
}

/* --- 조회 보조 ------------------------------------------------------------ */

/** 대시보드에서 "지금 손대고 있는" 것으로 묶이는 상태들 */
export const OPEN_STATUSES: ProjectStatus[] = [
  "planning",
  "active",
  "hibernating",
];

export const isOpen = (status: ProjectStatus) => OPEN_STATUSES.includes(status);

/** 잠시멈춤 상태로 지낸 일수. 방치 리포트와 복귀 브리핑이 쓴다. */
export function daysSincePaused(
  project: { status: ProjectStatus; pausedAt?: Date },
  now = new Date()
): number | null {
  if (project.status !== "hibernating" || !project.pausedAt) return null;
  const ms = now.getTime() - project.pausedAt.getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}
