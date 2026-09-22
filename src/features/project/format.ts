import type { UIStrings } from "@/i18n/ui/ko";
import type { ProjectStatus } from "@/types/entities";

/**
 * 방치 기간 문구.
 *
 * 목록과 상세 양쪽에서 같은 표현을 써야 해서 한 곳에 둔다.
 * 0일을 "0일째 멈춤"으로 두면 문장이 어색해 당일은 따로 처리한다.
 */
export function pausedLabel(t: UIStrings, days: number): string {
  return days === 0
    ? t.project.pausedToday
    : t.project.pausedFor.replace("{days}", String(days));
}

/**
 * 하루 평균 뜨는 시간.
 *
 * 한 시간 미만이면 "0시간 12분"보다 "12분"이 읽기 쉽다.
 */
export function formatHours(t: UIStrings, hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h === 0
    ? t.finish.minutes.replace("{m}", String(m))
    : t.finish.hours.replace("{h}", String(h)).replace("{m}", String(m));
}

/** 오늘로부터 며칠 지났나. 음수는 0으로 본다(시계가 어긋난 기기). */
export function daysSince(date: Date, now: Date = new Date()): number {
  const ms = now.getTime() - date.getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

/**
 * 마지막으로 뜬 때.
 *
 * 프로젝트를 다시 열었을 때 첫 질문은 "어디까지 떴지"이고, 그 바로 옆이
 * **"언제 떴지"**다. 008에서 상세 상단에 넣으면서 홈과 같은 자리에서 가져온다 —
 * 두 화면이 같은 사실을 다른 말로 하면 어느 쪽이 맞는지 알 수 없게 된다.
 *
 * 계획중은 아직 뜬 적이 없으므로 "3일 전에 떴어요"라고 할 수 없다. 006이 홈에서
 * 그렇게 갈랐고 같은 문구를 쓴다.
 */
export function lastWorkedLabel(
  t: UIStrings,
  project: { status: ProjectStatus; updatedAt: Date },
  now: Date = new Date()
): string {
  if (project.status === "planning") return t.dashboard.notStarted;
  const days = daysSince(project.updatedAt, now);
  return days === 0
    ? t.dashboard.lastWorkedToday
    : t.dashboard.lastWorkedDays.replace("{n}", String(days));
}
