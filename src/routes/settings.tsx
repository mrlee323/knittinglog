import { createFileRoute } from "@tanstack/react-router";
import { useAtom } from "jotai";
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
      <h2 className="text-text-muted mb-2 text-sm font-medium">{label}</h2>
      <div className="bg-surface-muted flex gap-1 rounded-xl p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm transition-colors",
              value === option.value
                ? "bg-accent text-accent-fg font-semibold"
                : "text-text-muted"
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
