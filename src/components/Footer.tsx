import { useLocale } from "../context/LocaleContext";
import { useTheme } from "../context/ThemeContext";

export function Footer() {
  const { t } = useLocale();
  const { mode } = useTheme();
  const border = mode === "dark" ? "border-white/15" : "border-black/10";
  const link =
    mode === "dark"
      ? "text-brand hover:underline"
      : "text-brand-light hover:underline";

  return (
    <footer className={`border-t ${border}`}>
      <div className="mx-auto max-w-3xl px-4 py-6 text-sm">
        <a href="https://tiagocosmai.github.io/" className={link}>
          {t("footer_portfolio")}
        </a>
      </div>
    </footer>
  );
}
