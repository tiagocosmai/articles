import { useLocale } from "../context/LocaleContext";
import { useTheme } from "../context/ThemeContext";
import { LANGUAGE_OPTIONS } from "./Flags";

export function Header() {
  const { locale, setLocale, t } = useLocale();
  const { mode, toggle } = useTheme();
  const isDark = mode === "dark";
  const border = isDark ? "border-white/15" : "border-black/10";
  const active = isDark
    ? "border-brand/50 bg-brand/15"
    : "border-brand-light/40 bg-brand-light/10";
  const idle = isDark
    ? "border-white/15 bg-white/5"
    : "border-black/10 bg-white";

  return (
    <header className={`border-b ${border}`}>
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
        <p className="font-mono text-sm font-bold">{t("site_name")}</p>
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1"
            role="group"
            aria-label={t("lang_select_aria")}
          >
            {LANGUAGE_OPTIONS.map(({ value, label, Flag }) => (
              <button
                key={value}
                type="button"
                id={`lang-${value}`}
                data-testid={`lang-${value}`}
                aria-pressed={locale === value}
                onClick={() => setLocale(value)}
                className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-bold ${
                  locale === value ? active : idle
                }`}
              >
                <Flag className="h-5 w-5" />
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            id="theme-toggle"
            data-testid="theme-toggle"
            onClick={toggle}
            aria-label={isDark ? t("theme_to_light") : t("theme_to_dark")}
            className={`rounded-full border p-2 ${idle}`}
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>
    </header>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <circle cx="12" cy="12" r="4" fill="currentColor" />
      <path
        d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5z"
        fill="currentColor"
      />
    </svg>
  );
}
