import type { Article, Locale } from "../types/content";
import { filterArticles, type ArticleFilters } from "./filterArticles";

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

export const LIST_PAGE_SIZE = 10;

export type ListedArticle = {
  key: string;
  article: Article;
};

export function repeatArticles(articles: Article[], copies: number): ListedArticle[] {
  const listed: ListedArticle[] = [];
  for (let copy = 0; copy < copies; copy += 1) {
    for (const article of articles) {
      listed.push({
        key: copies === 1 ? article.slug : `${article.slug}-${copy}`,
        article,
      });
    }
  }
  return listed;
}

export function filterListedArticles(
  items: ListedArticle[],
  locale: Locale,
  filters: ArticleFilters,
): ListedArticle[] {
  const matched = new Set(
    filterArticles(
      items.map((item) => item.article),
      locale,
      filters,
    ),
  );
  return items.filter((item) => matched.has(item.article));
}

export function sortListedArticles(
  items: ListedArticle[],
  locale: Locale,
  sort: ArticleSort,
): ListedArticle[] {
  return items
    .slice()
    .sort((left, right) => compareArticles(left.article, right.article, locale, sort));
}

export function revealArticles<T>(items: T[], shown: number): T[] {
  return items.slice(0, shown);
}

export function formatArticleCount(template: string, matched: number, total: number): string {
  return template.replaceAll("{matched}", String(matched)).replaceAll("{total}", String(total));
}
