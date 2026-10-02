import type { Article, Locale } from "../types/content";

export type ArticleFilters = {
  query: string;
  dateFrom: string;
  dateTo: string;
  tags: string[];
};

const DATE_LOCALES: Record<Locale, string> = {
  pt: "pt-BR",
  en: "en",
  es: "es",
};

export function filterArticles(
  articles: Article[],
  locale: Locale,
  filters: ArticleFilters,
): Article[] {
  const query = filters.query.toLowerCase();

  return articles
    .filter((article) => {
      if (query) {
        const { title, description } = article.locales[locale];
        const haystack = `${title} ${description}`.toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }

      if (filters.dateFrom && article.date < filters.dateFrom) {
        return false;
      }

      if (filters.dateTo && article.date > filters.dateTo) {
        return false;
      }

      if (
        filters.tags.length > 0 &&
        !filters.tags.every((tag) => article.tags.includes(tag))
      ) {
        return false;
      }

      return true;
    });
}

export function formatArticleDate(isoDate: string, locale: Locale): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat(DATE_LOCALES[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function collectTags(articles: Article[]): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const article of articles) {
    for (const tag of article.tags) {
      if (seen.has(tag)) {
        continue;
      }
      seen.add(tag);
      tags.push(tag);
    }
  }

  return tags;
}

export function countArticlesForTag(
  articles: Article[],
  locale: Locale,
  filters: ArticleFilters,
  tag: string,
): number {
  const tags = filters.tags.includes(tag) ? filters.tags : [...filters.tags, tag];
  return filterArticles(articles, locale, { ...filters, tags }).length;
}

export function tagBadgeText(count: number): string | null {
  if (count <= 0) {
    return null;
  }
  if (count > 99) {
    return "+99";
  }
  return String(count);
}
