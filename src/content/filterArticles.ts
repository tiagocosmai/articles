import type { Article, Locale } from "../types/content";

export type ArticleFilters = { query: string; date: string; tags: string[] };

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

      if (filters.date && article.date !== filters.date) {
        return false;
      }

      if (
        filters.tags.length > 0 &&
        !filters.tags.every((tag) => article.tags.includes(tag))
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
