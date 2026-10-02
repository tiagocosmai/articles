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
import { useTheme } from "../context/ThemeContext";
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
        <SortControl
          field={field}
          direction={direction}
          onField={setField}
          onDirection={setDirection}
        />
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

function SortControl({
  field,
  direction,
  onField,
  onDirection,
}: {
  field: ArticleSort["field"];
  direction: ArticleSort["direction"];
  onField: (field: ArticleSort["field"]) => void;
  onDirection: (direction: ArticleSort["direction"]) => void;
}) {
  const { t } = useLocale();
  const { mode } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isDark = mode === "dark";

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const trigger = isDark
    ? "border-white/20 text-brand hover:bg-white/5"
    : "border-black/15 text-brand-light hover:bg-black/5";
  const panel = isDark
    ? "border-white/15 bg-surface-dark text-white"
    : "border-black/10 bg-white text-black";
  const idle = isDark ? "border-white/15 text-white/80" : "border-black/15 text-black/80";
  const selected = isDark
    ? "border-brand bg-brand/15 text-brand"
    : "border-brand-light bg-brand-light/10 text-brand-light";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={t("sort_field_label")}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
        className={`rounded-md border p-2 ${trigger}`}
      >
        <SortIcon />
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label={t("sort_field_label")}
          className={`absolute right-0 z-20 mt-2 w-56 rounded-lg border p-3 shadow-lg ${panel}`}
        >
          <fieldset>
            <legend className="mb-2 text-xs opacity-70">{t("sort_field_label")}</legend>
            <div className="flex gap-2">
              <SortChoice
                pressed={field === "date"}
                className={field === "date" ? selected : idle}
                onClick={() => onField("date")}
              >
                {t("sort_date")}
              </SortChoice>
              <SortChoice
                pressed={field === "title"}
                className={field === "title" ? selected : idle}
                onClick={() => onField("title")}
              >
                {t("sort_title")}
              </SortChoice>
            </div>
          </fieldset>
          <fieldset className="mt-3">
            <legend className="mb-2 text-xs opacity-70">{t("sort_direction_label")}</legend>
            <div className="flex gap-2">
              <SortChoice
                pressed={direction === "asc"}
                className={direction === "asc" ? selected : idle}
                onClick={() => onDirection("asc")}
              >
                {t("sort_asc")}
              </SortChoice>
              <SortChoice
                pressed={direction === "desc"}
                className={direction === "desc" ? selected : idle}
                onClick={() => onDirection("desc")}
              >
                {t("sort_desc")}
              </SortChoice>
            </div>
          </fieldset>
        </div>
      ) : null}
    </div>
  );
}

function SortChoice({
  pressed,
  onClick,
  className,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  className: string;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`flex-1 rounded-md border px-2 py-1.5 text-sm ${className}`}
    >
      {children}
    </button>
  );
}

function SortIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 7l4-4 4 4" />
      <path d="M12 3v18" />
      <path d="M16 17l-4 4-4-4" />
    </svg>
  );
}
