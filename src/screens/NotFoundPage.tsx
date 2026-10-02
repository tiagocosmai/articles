import { BlogLink } from "../components/BlogLink";
import { useLocale } from "../context/LocaleContext";
import { useTheme } from "../context/ThemeContext";

export function NotFoundPage() {
  const { t } = useLocale();
  const { mode } = useTheme();
  const link =
    mode === "dark"
      ? "text-brand hover:underline"
      : "text-brand-light hover:underline";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <h1 className="font-mono text-3xl leading-tight">{t("not_found_title")}</h1>
      <p>{t("not_found_body")}</p>
      <BlogLink to="/" className={link}>
        {t("back_home")}
      </BlogLink>
    </div>
  );
}
