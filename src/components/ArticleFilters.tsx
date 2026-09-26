import { useLocale } from "../context/LocaleContext";
import { useTheme } from "../context/ThemeContext";

type ArticleFiltersProps = {
  query: string;
  date: string;
  selectedTags: string[];
  availableTags: string[];
  onQueryChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onToggleTag: (tag: string) => void;
};

export function ArticleFilters({
  query,
  date,
  selectedTags,
  availableTags,
  onQueryChange,
  onDateChange,
  onToggleTag,
}: ArticleFiltersProps) {
  const { t } = useLocale();
  const { mode } = useTheme();
  const isDark = mode === "dark";
  const field = isDark
    ? "border-white/20 bg-white/5"
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
      <label className="flex flex-col gap-1 text-sm">
        {t("date_label")}
        <input
          type="date"
          value={date}
          onChange={(event) => onDateChange(event.target.value)}
          className={`rounded-md border px-3 py-2 ${field}`}
        />
      </label>
      <div className="flex flex-col gap-2">
        <span className="text-sm">{t("tags_label")}</span>
        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => {
            const pressed = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={pressed}
                onClick={() => onToggleTag(tag)}
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
