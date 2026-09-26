import { Link } from "react-router-dom";
import { formatArticleDate } from "../content/filterArticles";
import { useLocale } from "../context/LocaleContext";
import { useTheme } from "../context/ThemeContext";
import type { Article } from "../types/content";

export function ArticleCard({ article }: { article: Article }) {
  const { locale } = useLocale();
  const { mode } = useTheme();
  const { title, description } = article.locales[locale];
  const titleColor = mode === "dark" ? "text-brand" : "text-brand-light";
  const border = mode === "dark" ? "border-white/15" : "border-black/10";

  return (
    <Link
      to={`/${article.slug}`}
      className={`block rounded-lg border ${border} px-4 py-4`}
    >
      <h2 className={`font-mono text-2xl leading-snug ${titleColor}`}>{title}</h2>
      <time dateTime={article.date} className="mt-2 block text-sm opacity-80">
        {formatArticleDate(article.date, locale)}
      </time>
      <p className="mt-3 leading-relaxed">{description}</p>
    </Link>
  );
}
