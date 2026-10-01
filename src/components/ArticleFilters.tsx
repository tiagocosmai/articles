import { useLocale } from "../context/LocaleContext";
import { BlogLink } from "./BlogLink";
import { useTheme } from "../context/ThemeContext";

type ArticleFiltersProps = {
  query: string;
  dateFrom: string;
  dateTo: string;
  selectedTags: string[];
  availableTags: string[];
  onQueryChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onToggleTag?: (tag: string) => void;
  tagHref?: (tag: string) => string;
};

export function ArticleFilters({
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
  const { t } = useLocale();
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
        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => {
            const className = `inline-block rounded-full border px-3 py-1 text-sm ${tagIdle}`;
            if (tagHref) {
              return (
                <BlogLink key={tag} to={tagHref(tag)} className={className}>
                  #{tag}
                </BlogLink>
              );
            }

            const pressed = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={pressed}
                onClick={() => onToggleTag?.(tag)}
                className={`rounded-full border px-3 py-1 text-sm ${
                  pressed ? tagPressed : tagIdle
                }`}
              >
                #{tag}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
