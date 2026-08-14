import { useStrings } from "@/i18n";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/types/entities";

/**
 * 잠시멈춤에 경고색을 쓰지 않는 것이 의도다.
 * 중단을 죄악시하지 않는다는 서비스의 태도가 색에서도 드러나야 한다.
 */
const TONE: Record<ProjectStatus, string> = {
  planning: "bg-planning/12 text-planning",
  active: "bg-active/12 text-active",
  hibernating: "bg-hibernating/12 text-hibernating",
  finished: "bg-finished/12 text-finished",
  frogged: "bg-frogged/12 text-frogged",
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
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium",
        TONE[status],
        className
      )}
    >
      {t.status[status]}
    </span>
  );
}
