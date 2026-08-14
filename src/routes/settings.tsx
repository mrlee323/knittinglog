import { createFileRoute, Link } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { ChevronRight, Ruler } from "lucide-react";
import { Page } from "@/components/ui/page";
import { themeAtom, type ThemeMode } from "@/app/theme";
import { unitSystemAtom } from "@/app/preferences";
import { localeAtom, useStrings, type Locale } from "@/i18n";
import type { UnitSystem } from "@/domain/units";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <section className="mb-5">
      <h2 className="text-text-2 text-small mb-2 font-medium">{label}</h2>
      <div className="bg-sunken flex gap-1 rounded-md p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={cn(
              "text-small flex-1 rounded-md py-2 transition-colors",
              value === option.value
                ? "bg-accent text-on-accent font-semibold"
                : "text-text-2"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function SettingsPage() {
  const t = useStrings();
  const [locale, setLocale] = useAtom(localeAtom);
  const [theme, setTheme] = useAtom(themeAtom);
  const [units, setUnits] = useAtom(unitSystemAtom);

  return (
    <Page title={t.nav.settings}>
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
        options={[
          { value: "ko", label: "한국어" },
          { value: "en", label: "English" },
        ]}
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
