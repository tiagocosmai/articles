import {
  filterArticles,
  type ArticleFilters as Filters,
} from "../content/filterArticles";
import { useLocale } from "../context/LocaleContext";
import type { Article } from "../types/content";
import { ArticleCard } from "./ArticleCard";

export function ArticleList({
  articles,
  filters,
}: {
  articles: Article[];
  filters: Filters;
}) {
  const { locale, t } = useLocale();
  const visible = filterArticles(articles, locale, filters);

  if (visible.length === 0) {
    return <p>{t("empty_results")}</p>;
  }

  return (
    <ul className="flex flex-col gap-4">
      {visible.map((article) => (
        <li key={article.slug}>
          <ArticleCard article={article} />
        </li>
      ))}
    </ul>
  );
}
