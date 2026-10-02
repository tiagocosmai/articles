import type { Article, Locale } from "../types/content";
import type { ArticleFilters } from "./filterArticles";
import {
  filterListedArticles,
  formatArticleCount,
  LIST_PAGE_SIZE,
  repeatArticles,
  revealArticles,
  sortArticles,
  sortListedArticles,
} from "./listArticles";

function article(partial: {
  slug: string;
  date: string;
  titles: Record<Locale, string>;
}): Article {
  return {
    slug: partial.slug,
    date: partial.date,
    tags: [],
    locales: {
      pt: { title: partial.titles.pt, description: "", markdown: "a.pt.md" },
      en: { title: partial.titles.en, description: "", markdown: "a.en.md" },
      es: { title: partial.titles.es, description: "", markdown: "a.es.md" },
    },
  };
}

const older = article({
  slug: "older",
  date: "2026-09-01",
  titles: { pt: "Beta", en: "Alpha", es: "Beta" },
});
const newer = article({
  slug: "newer",
  date: "2026-09-24",
  titles: { pt: "Alpha", en: "Zulu", es: "Alpha" },
});
const sameDayB = article({
  slug: "b",
  date: "2026-09-24",
  titles: { pt: "Alpha", en: "Alpha", es: "Alpha" },
});
const sameDayA = article({
  slug: "a",
  date: "2026-09-24",
  titles: { pt: "Alpha", en: "Alpha", es: "Alpha" },
});
const sameTitleOlder = article({
  slug: "z",
  date: "2026-09-01",
  titles: { pt: "Alpha", en: "Alpha", es: "Alpha" },
});
const sameTitleNewer = article({
  slug: "m",
  date: "2026-09-24",
  titles: { pt: "Alpha", en: "Alpha", es: "Alpha" },
});

describe("sortArticles", () => {
  it("sorts dates newest first and oldest first", () => {
    expect(sortArticles([older, newer], "pt", { field: "date", direction: "desc" })).toEqual([
      newer,
      older,
    ]);
    expect(sortArticles([newer, older], "pt", { field: "date", direction: "asc" })).toEqual([
      older,
      newer,
    ]);
  });

  it("breaks date ties by slug ascending in both directions", () => {
    expect(sortArticles([sameDayB, sameDayA], "pt", { field: "date", direction: "desc" })).toEqual([
      sameDayA,
      sameDayB,
    ]);
    expect(sortArticles([sameDayB, sameDayA], "pt", { field: "date", direction: "asc" })).toEqual([
      sameDayA,
      sameDayB,
    ]);
  });

  it("sorts the active locale title and does not flip title tie-breaks", () => {
    expect(sortArticles([older, newer], "pt", { field: "title", direction: "asc" })).toEqual([
      newer,
      older,
    ]);
    expect(sortArticles([older, newer], "en", { field: "title", direction: "asc" })).toEqual([
      older,
      newer,
    ]);
    expect(
      sortArticles([sameTitleOlder, sameTitleNewer], "pt", { field: "title", direction: "desc" }),
    ).toEqual([sameTitleNewer, sameTitleOlder]);
    expect(
      sortArticles([sameTitleOlder, sameTitleNewer], "pt", { field: "title", direction: "asc" }),
    ).toEqual([sameTitleNewer, sameTitleOlder]);
  });
});

describe("repeatArticles", () => {
  it("uses the slug as the key for a single copy", () => {
    expect(repeatArticles([older, newer], 1)).toEqual([
      { key: "older", article: older },
      { key: "newer", article: newer },
    ]);
  });

  it("repeats fifteen copies with unique keys and the original slug", () => {
    const listed = repeatArticles([older, newer], 15);
    expect(listed).toHaveLength(30);
    expect(new Set(listed.map((item) => item.key)).size).toBe(30);
    expect(listed.every((item) => item.article === older || item.article === newer)).toBe(true);
    expect(listed[0]).toEqual({ key: "older-0", article: older });
    expect(listed[2]).toEqual({ key: "older-1", article: older });
  });
});

describe("revealArticles", () => {
  it("returns the first page and the next page", () => {
    const items = Array.from({ length: 12 }, (_, index) => index);
    expect(LIST_PAGE_SIZE).toBe(10);
    expect(revealArticles(items, LIST_PAGE_SIZE)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(revealArticles(items, LIST_PAGE_SIZE * 2)).toEqual(items);
    expect(revealArticles([1, 2, 3], LIST_PAGE_SIZE)).toEqual([1, 2, 3]);
  });
});

describe("formatArticleCount", () => {
  it("replaces matched and total", () => {
    expect(formatArticleCount("{matched} de {total} artigos", 5, 102)).toBe("5 de 102 artigos");
    expect(formatArticleCount("{matched} of {total} articles", 0, 2)).toBe("0 of 2 articles");
  });
});

describe("listed articles", () => {
  it("keeps every copy that passes the filter and sorts without dropping copies", () => {
    const listed = repeatArticles([older, newer], 2);
    const filters: ArticleFilters = { query: "alpha", dateFrom: "", dateTo: "", tags: [] };
    const matched = filterListedArticles(listed, "pt", filters);
    expect(matched.map((item) => item.key)).toEqual(["newer-0", "newer-1"]);
    expect(
      sortListedArticles(listed, "pt", { field: "date", direction: "asc" }).map((item) => item.key),
    ).toEqual(["older-0", "older-1", "newer-0", "newer-1"]);
  });
});
