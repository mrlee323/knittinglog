import {
  createRootRoute,
  Link,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { Home, Layers, Ruler, Settings, Spool } from "lucide-react";
import { useApplyTheme } from "@/app/theme";
import { useStrings } from "@/i18n";
import { cn } from "@/lib/utils";

/**
 * 앱 셸.
 *
 * 실사용의 대부분이 소파에서 폰이므로 모바일 우선 + 하단 탭이 기본이다.
 * 뜨기 모드(`/projects/$id/knit`)는 이 셸을 쓰지 않고 풀스크린으로 뜬다.
 */
export const Route = createRootRoute({ component: RootLayout });

function RootLayout() {
  useApplyTheme();
  const t = useStrings();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // 뜨기 모드는 화면을 통째로 쓴다. 손이 실에 묶인 채로 쓰는 화면이라
  // 탭바가 차지하는 높이와 오탭 위험을 감당할 이유가 없다.
  if (pathname.endsWith("/knit")) return <Outlet />;

  const tabs = [
    { to: "/", icon: Home, label: t.nav.dashboard },
    { to: "/projects", icon: Layers, label: t.nav.projects },
    { to: "/gauge", icon: Ruler, label: t.nav.gauge },
    { to: "/yarn", icon: Spool, label: t.nav.yarn },
    { to: "/settings", icon: Settings, label: t.nav.settings },
  ] as const;

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="pt-safe flex-1 pb-20">
        <Outlet />
      </main>

      <nav className="pb-safe bg-surface/90 border-line fixed inset-x-0 bottom-0 border-t backdrop-blur">
        <ul className="mx-auto flex max-w-lg">
          {tabs.map(({ to, icon: Icon, label }) => (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className="text-text-2 flex flex-col items-center gap-1 py-2 transition-colors"
                activeProps={{ className: "!text-accent" }}
                activeOptions={{ exact: to === "/" }}
              >
                {({ isActive }: { isActive: boolean }) => (
                  <>
                    <Icon size={22} strokeWidth={isActive ? 2.4 : 1.8} />
                    <span
                      className={cn("text-micro", isActive && "font-semibold")}
                    >
                      {label}
                    </span>
                  </>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
