import type { Article, Locale } from "../types/content";

export type ArticleSort = {
  field: "date" | "title";
  direction: "asc" | "desc";
};

const TITLE_LOCALES: Record<Locale, string> = {
  pt: "pt-BR",
  en: "en",
  es: "es",
};

function compareArticles(
  left: Article,
  right: Article,
  locale: Locale,
  sort: ArticleSort,
): number {
  const primary =
    sort.field === "date"
      ? left.date < right.date
        ? -1
        : left.date > right.date
          ? 1
          : 0
      : left.locales[locale].title.localeCompare(
          right.locales[locale].title,
          TITLE_LOCALES[locale],
        );

  if (primary !== 0) {
    return sort.direction === "asc" ? primary : -primary;
  }

  if (sort.field === "title" && left.date !== right.date) {
    return left.date < right.date ? 1 : -1;
  }

  if (left.slug === right.slug) {
    return 0;
  }

  return left.slug < right.slug ? -1 : 1;
}

export function sortArticles(
  articles: Article[],
  locale: Locale,
  sort: ArticleSort,
): Article[] {
  return articles.slice().sort((left, right) => compareArticles(left, right, locale, sort));
}
