import { useStrings } from "@/i18n";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/types/entities";

/**
 * 상태 알약.
 *
 * 진행중만 꽉 찬 먹색이다. 지금 손대고 있는 것 하나만 두드러지면 되고
 * 나머지는 정보로만 있으면 된다. 화면의 채도는 작품 사진과 실 색에 양보한다.
 *
 * 잠시멈춤에 경고색(노랑·주황)을 쓰지 않는 것은 미적 선택이 아니라
 * 이 서비스의 전제다 — 중단은 경고할 일이 아니다.
 */
const TONE: Record<ProjectStatus, string> = {
  planning: "bg-sunken text-planning",
  active: "bg-accent text-on-accent",
  hibernating: "bg-sunken text-hibernating",
  finished: "bg-sunken text-finished",
  frogged: "bg-sunken text-frogged",
};

export function StatusBadge({
  status,
  className,
}: {
  status: ProjectStatus;
  className?: string;
}) {
  const t = useStrings();
  return (
    <span
      className={cn(
        "text-micro inline-flex shrink-0 items-center rounded-sm px-1.5 py-1 font-semibold",
        TONE[status],
        className
      )}
    >
      {t.status[status]}
    </span>
  );
}
