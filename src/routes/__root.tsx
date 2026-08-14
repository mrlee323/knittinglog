import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
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

      <nav className="pb-safe bg-surface/90 border-border fixed inset-x-0 bottom-0 border-t backdrop-blur">
        <ul className="mx-auto flex max-w-lg">
          {tabs.map(({ to, icon: Icon, label }) => (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className="text-text-muted flex flex-col items-center gap-1 py-2 transition-colors"
                activeProps={{ className: "!text-accent" }}
                activeOptions={{ exact: to === "/" }}
              >
                {({ isActive }: { isActive: boolean }) => (
                  <>
                    <Icon size={22} strokeWidth={isActive ? 2.4 : 1.8} />
                    <span
                      className={cn("text-[11px]", isActive && "font-semibold")}
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
