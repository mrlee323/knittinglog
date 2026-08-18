import { Link } from "@tanstack/react-router";
import { useStrings } from "@/i18n";
import type { Id } from "@/types/entities";

/**
 * 프로젝트 안의 화면 전환.
 *
 * 한 프로젝트를 네 가지 방식으로 쓴다 — 상태를 훑고(개요), 도안·영상을 놓고
 * 보고(작업대), 지난 기록을 되돌아보고(기록), 카운터를 누른다(뜨기). 체류
 * 방식이 다르므로 한 스크롤에 쌓지 않고 화면으로 나눈다. 특히 "도안 보면서
 * 영상 따라가기"는 세로로 쌓인 문서에서는 성립하지 않는다.
 *
 * 탭을 URL로 두는 이유는 복귀다. 태블릿에서 도안 화면을 열어둔 채 새로고침해도
 * 그 자리로 돌아와야 한다.
 */
export function ProjectTabs({ projectId }: { projectId: Id }) {
  const t = useStrings();

  const tabs = [
    { to: "/projects/$projectId", label: t.project.tabOverview, exact: true },
    { to: "/projects/$projectId/refs", label: t.project.tabWorkbench },
    { to: "/projects/$projectId/log", label: t.project.tabLog },
    { to: "/projects/$projectId/knit", label: t.counter.knit },
  ] as const;

  return (
    <nav className="no-scrollbar border-line -mx-4 mb-5 flex gap-1 overflow-x-auto border-b px-4 md:mx-0 md:px-0">
      {tabs.map(({ to, label, ...rest }) => (
        <Link
          key={to}
          to={to}
          params={{ projectId }}
          activeOptions={{ exact: "exact" in rest }}
          // 밑줄을 쓰는 이유는 탭이 본문의 일부라는 신호다. 알약으로 채우면
          // 상태 뱃지와 경쟁하고, 화면에서 채도 없는 강조가 두 개가 된다.
          className="text-small text-text-2 hover:text-text -mb-px min-h-11 shrink-0 border-b-2 border-transparent px-3 pt-2 transition"
          activeProps={{
            className: "!text-text !border-accent font-semibold",
          }}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
