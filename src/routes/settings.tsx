import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { ChevronRight, Ruler } from "lucide-react";
import { InstallCard } from "@/features/install/components/install-card";
import { BackupCard } from "@/features/backup/components/backup-card";
import { Page } from "@/components/ui/page";
import { SegmentedControl } from "@/components/ui/segmented";
import { themeAtom, type ThemeMode } from "@/app/theme";
import { unitSystemAtom } from "@/app/preferences";
import {
  LOCALE_NAMES,
  LOCALES,
  localeAtom,
  useStrings,
  type Locale,
} from "@/i18n";
import type { UnitSystem } from "@/domain/units";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  const t = useStrings();
  const [locale, setLocale] = useAtom(localeAtom);
  const [theme, setTheme] = useAtom(themeAtom);
  const [units, setUnits] = useAtom(unitSystemAtom);

  return (
    <Page title={t.nav.settings}>
      <InstallCard />

      {/* 백업이 설정의 첫 자리다 — 계정이 없어서 이 기기가 유일한 사본이다 */}
      <BackupCard />

      {/* 치수 프로필은 설정보다 데이터에 가깝지만 하단 탭을 늘리기엔 애매하다.
          계산기 안에서도 바로 고를 수 있으므로 입구는 여기 하나면 된다. */}
      <Link
        to="/profiles"
        className="border-line bg-surface mb-5 flex items-center justify-between gap-3 rounded-md border p-3"
      >
        <span className="flex items-center gap-2">
          <Ruler size={16} className="text-text-2" />
          <span className="text-small font-medium">{t.profile.title}</span>
        </span>
        <ChevronRight size={16} className="text-text-3" />
      </Link>

      <SegmentedControl<Locale>
        label={t.settings.language}
        value={locale}
        onChange={setLocale}
        options={LOCALES.map((code) => ({
          value: code,
          label: LOCALE_NAMES[code],
        }))}
      />

      <SegmentedControl<ThemeMode>
        label={t.settings.theme}
        value={theme}
        onChange={setTheme}
        options={[
          { value: "system", label: t.settings.themeSystem },
          { value: "light", label: t.settings.themeLight },
          { value: "dark", label: t.settings.themeDark },
        ]}
      />

      <SegmentedControl<UnitSystem>
        label={t.settings.units}
        value={units}
        onChange={setUnits}
        options={[
          { value: "metric", label: "cm · g · m" },
          { value: "imperial", label: "in · oz · yd" },
        ]}
      />
    </Page>
  );
}
