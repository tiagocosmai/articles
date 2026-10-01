import type { Article, ArticleTag, Locale } from "../types/content";

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
        !filters.tags.every((tag) => article.tags.some((item) => item.id === tag))
      ) {
        return false;
      }

      return true;
    })
    .slice()
    .sort((left, right) => {
      if (left.date !== right.date) {
        return left.date < right.date ? 1 : -1;
      }
      if (left.slug === right.slug) {
        return 0;
      }
      return left.slug < right.slug ? -1 : 1;
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

export function tagLabel(tag: ArticleTag, locale: Locale): string {
  return tag[locale];
}

export function collectTags(articles: Article[]): ArticleTag[] {
  const seen = new Set<string>();
  const tags: ArticleTag[] = [];

  for (const article of articles) {
    for (const tag of article.tags) {
      if (seen.has(tag.id)) {
        continue;
      }
      seen.add(tag.id);
      tags.push(tag);
    }
  }

  return tags;
}
