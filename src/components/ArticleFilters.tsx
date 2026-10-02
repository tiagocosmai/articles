import { countArticlesForTag, tagBadgeText, tagLabel } from "../content/filterArticles";
import { useLocale } from "../context/LocaleContext";
import type { Article, ArticleTag } from "../types/content";
import { BlogLink } from "./BlogLink";
import { useTheme } from "../context/ThemeContext";

type ArticleFiltersProps = {
  articles: Article[];
  query: string;
  dateFrom: string;
  dateTo: string;
  selectedTags: string[];
  availableTags: ArticleTag[];
  onQueryChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onToggleTag?: (tag: string) => void;
  tagHref?: (tag: string) => string;
};

export function ArticleFilters({
  articles,
  query,
  dateFrom,
  dateTo,
  selectedTags,
  availableTags,
  onQueryChange,
  onDateFromChange,
  onDateToChange,
  onToggleTag,
  tagHref,
}: ArticleFiltersProps) {
  const { locale, t } = useLocale();
  const { mode } = useTheme();
  const isDark = mode === "dark";
  const field = isDark
    ? "border-white/20 bg-white/5 [color-scheme:dark]"
    : "border-black/15 bg-white";
  const tagIdle = isDark
    ? "border-brand/40 text-brand"
    : "border-brand-light/40 text-brand-light";
  const tagPressed = isDark
    ? "border-brand bg-brand/20 text-brand"
    : "border-brand-light bg-brand-light/15 text-brand-light";
  const tagDisabled = isDark
    ? "cursor-not-allowed border-white/15 text-white/35"
    : "cursor-not-allowed border-black/10 text-black/35";
  const filters = { query, dateFrom, dateTo, tags: selectedTags };

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        {t("search_label")}
        <input
          type="search"
          value={query}
          placeholder={t("search_placeholder")}
          onChange={(event) => onQueryChange(event.target.value)}
          className={`rounded-md border px-3 py-2 ${field}`}
        />
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm">{t("date_label")}</legend>
        <label className="flex flex-col gap-1 text-sm">
          {t("date_from")}
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => onDateFromChange(event.target.value)}
            className={`rounded-md border px-3 py-2 ${field}`}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("date_to")}
          <input
            type="date"
            value={dateTo}
            onChange={(event) => onDateToChange(event.target.value)}
            className={`rounded-md border px-3 py-2 ${field}`}
          />
        </label>
      </fieldset>
      <div className="flex flex-col gap-2">
        <span className="text-sm">{t("tags_label")}</span>
        <div className="flex flex-wrap gap-2 pt-2">
          {availableTags.map((tag) => {
            const selected = selectedTags.includes(tag.id);
            const count = countArticlesForTag(articles, locale, filters, tag.id);
            const badge = tagBadgeText(count);
            const disabled = count === 0 && !selected;
            const tone = disabled ? tagDisabled : selected ? tagPressed : tagIdle;
            const className = `group relative inline-block rounded-full border px-3 py-1 text-sm ${tone}`;
            const label = `#${tagLabel(tag, locale)}`;
            const badgeNode = badge ? (
              <span
                aria-hidden="true"
                className="invisible absolute -right-1 -top-2 min-w-5 rounded-full bg-brand px-1 text-center text-[10px] font-bold leading-4 text-black group-hover:visible group-focus-visible:visible"
              >
                {badge}
              </span>
            ) : null;

            if (disabled) {
              return (
                <span key={tag.id} aria-disabled="true" className={className}>
                  {label}
                </span>
              );
            }

            if (tagHref) {
              return (
                <BlogLink key={tag.id} to={tagHref(tag.id)} className={className}>
                  {label}
                  {badgeNode}
                </BlogLink>
              );
            }

            return (
              <button
                key={tag.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onToggleTag?.(tag.id)}
                className={className}
              >
                {label}
                {badgeNode}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
