import {
  createRootRoute,
  Link,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { Bookmark, Home, Layers, Ruler, Settings, Spool } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useApplyTheme } from "@/app/theme";
import { useStrings } from "@/i18n";
import { cn } from "@/lib/utils";

/**
 * 앱 셸.
 *
 * **기준 화면은 태블릿과 PC다.** 뜨개는 도안·사진·차트를 동시에 놓고 보는
 * 작업이고 그건 좁은 화면에서 성립하지 않는다. 폰은 보조 — 뜨는 중에 단수를
 * 세고 사진을 찍는 자리다.
 *
 * 그래서 md(768px) 이상에서는 왼쪽 고정 사이드바를, 그 아래에서는 하단 탭을
 * 쓴다. 둘을 같은 목록으로 만드는 이유는 이동 구조가 화면 크기에 따라 달라지면
 * 사용자가 두 번 배워야 하기 때문이다.
 *
 * 뜨기 모드(`/projects/$id/knit`)는 이 셸을 쓰지 않고 풀스크린으로 뜬다.
 */
export const Route = createRootRoute({ component: RootLayout });

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

function RootLayout() {
  useApplyTheme();
  const t = useStrings();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // 뜨기 모드는 화면을 통째로 쓴다. 손이 실에 묶인 채로 쓰는 화면이라
  // 탭바가 차지하는 높이와 오탭 위험을 감당할 이유가 없다.
  if (pathname.endsWith("/knit")) return <Outlet />;

  const items: NavItem[] = [
    { to: "/", icon: Home, label: t.nav.dashboard },
    { to: "/projects", icon: Layers, label: t.nav.projects },
    { to: "/gauge", icon: Ruler, label: t.nav.gauge },
    { to: "/yarn", icon: Spool, label: t.nav.yarn },
    // 옛 "기록" 탭 자리다. 전체 합계와 잔디는 자기만족용이었고 방치 목록·활동
    // 집계는 홈과 겹쳤다. 스크랩은 공유로 계속 쌓이는 것이라 들어갈 길이 늘
    // 보여야 한다.
    { to: "/inspiration", icon: Bookmark, label: t.nav.scrap },
    { to: "/settings", icon: Settings, label: t.nav.settings },
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <Sidebar items={items} />

      {/* 사이드바는 fixed라 흐름에서 빠진다. 본문을 그만큼 밀어준다. */}
      <main className="pt-safe flex-1 pb-20 md:pt-0 md:pb-0 md:pl-56">
        <Outlet />
      </main>

      <TabBar items={items} />
    </div>
  );
}

/** 태블릿·PC의 이동 수단. 라벨을 아이콘 옆에 두어 한 번에 읽힌다. */
function Sidebar({ items }: { items: NavItem[] }) {
  const t = useStrings();

  return (
    <nav className="border-line bg-surface fixed inset-y-0 left-0 hidden w-56 flex-col border-r px-3 py-5 md:flex">
      {/* 브랜드는 글자만 쓴다. UI가 색을 갖지 않는다는 원칙(docs/DESIGN.md)에
          로고 색도 포함된다. */}
      <Link to="/" className="text-subhead px-3 pb-4 font-semibold">
        {t.app.name}
      </Link>

      <ul className="space-y-0.5">
        {items.map(({ to, icon: Icon, label }) => (
          <li key={to}>
            <Link
              to={to}
              className="text-text-2 hover:bg-sunken hover:text-text flex min-h-11 items-center gap-3 rounded-md px-3 transition"
              activeProps={{ className: "!bg-sunken !text-text font-semibold" }}
              activeOptions={{ exact: to === "/" }}
            >
              {({ isActive }: { isActive: boolean }) => (
                <>
                  <Icon
                    size={18}
                    strokeWidth={isActive ? 2.4 : 1.8}
                    aria-hidden
                  />
                  <span className="text-small">{label}</span>
                </>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** 폰의 이동 수단. 엄지가 닿는 하단에 둔다. */
function TabBar({ items }: { items: NavItem[] }) {
  return (
    <nav className="pb-safe bg-surface/90 border-line fixed inset-x-0 bottom-0 border-t backdrop-blur md:hidden">
      <ul className="mx-auto flex max-w-lg">
        {items.map(({ to, icon: Icon, label }) => (
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
  );
}
