import type { UIStrings } from "@/i18n/ui/ko";

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
