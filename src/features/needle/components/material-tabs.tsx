import { Link } from "@tanstack/react-router";
import { useStrings } from "@/i18n";

/**
 * 재료 화면의 탭 — 실 / 바늘.
 *
 * 바늘을 사이드바 항목으로 올리지 않는 이유는 폰의 하단 탭이다. 이미 여섯 개이고
 * 375px에서 한 칸이 62px인데, 일곱 개가 되면 라벨이 깨진다. 실과 바늘은 둘 다
 * "가진 재료"라 같은 자리에 두는 게 맞기도 하다 — 프로젝트를 시작할 때 함께
 * 확인하는 것들이다.
 */
export function MaterialTabs() {
  const t = useStrings();

  const tabs = [
    { to: "/yarn", label: t.nav.yarn },
    { to: "/needles", label: t.needle.title },
  ] as const;

  return (
    <nav className="border-line -mx-4 mb-5 flex gap-1 border-b px-4 md:mx-0 md:px-0">
      {tabs.map(({ to, label }) => (
        <Link
          key={to}
          to={to}
          className="text-small text-text-2 hover:text-text -mb-px min-h-11 shrink-0 border-b-2 border-transparent px-3 pt-2 transition"
          activeProps={{ className: "!text-text !border-accent font-semibold" }}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
