import { useEffect, useRef, useState } from "react";
import type { ArticleFilters as Filters } from "../content/filterArticles";
import {
  filterListedArticles,
  formatArticleCount,
  LIST_PAGE_SIZE,
  revealArticles,
  sortListedArticles,
  type ArticleSort,
  type ListedArticle,
} from "../content/listArticles";
import { useLocale } from "../context/LocaleContext";
import { ArticleCard } from "./ArticleCard";

export function ArticleList({
  items,
  filters,
}: {
  items: ListedArticle[];
  filters: Filters;
}) {
  const { locale, t } = useLocale();
  const [field, setField] = useState<ArticleSort["field"]>("date");
  const [direction, setDirection] = useState<ArticleSort["direction"]>("desc");
  const [shown, setShown] = useState(LIST_PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const canObserve = typeof IntersectionObserver === "function";

  useEffect(() => {
    setShown(LIST_PAGE_SIZE);
  }, [filters.query, filters.dateFrom, filters.dateTo, filters.tags, field, direction, locale]);

  const matched = sortListedArticles(filterListedArticles(items, locale, filters), locale, {
    field,
    direction,
  });
  const visible = revealArticles(matched, canObserve ? shown : matched.length);
  const hasMore = canObserve && visible.length < matched.length;

  useEffect(() => {
    if (!hasMore || !sentinelRef.current) {
      return;
    }
    const node = sentinelRef.current;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setShown((current) => current + LIST_PAGE_SIZE);
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, visible.length]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p>{formatArticleCount(t("article_count"), matched.length, items.length)}</p>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm">
            {t("sort_field_label")}
            <select
              value={field}
              onChange={(event) => setField(event.target.value as ArticleSort["field"])}
              className="rounded-md border px-2 py-1"
            >
              <option value="date">{t("sort_date")}</option>
              <option value="title">{t("sort_title")}</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            {t("sort_direction_label")}
            <select
              value={direction}
              onChange={(event) => setDirection(event.target.value as ArticleSort["direction"])}
              className="rounded-md border px-2 py-1"
            >
              <option value="asc">{t("sort_asc")}</option>
              <option value="desc">{t("sort_desc")}</option>
            </select>
          </label>
        </div>
      </div>
      {matched.length === 0 ? (
        <p>{t("empty_results")}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {visible.map((item) => (
            <li key={item.key}>
              <ArticleCard article={item.article} />
            </li>
          ))}
        </ul>
      )}
      {hasMore ? <div ref={sentinelRef} aria-hidden="true" /> : null}
    </div>
  );
}
