import type { Article, ArticleTag, Locale } from "../types/content";
import {
  collectTags,
  filterArticles,
  formatArticleDate,
  tagLabel,
} from "./filterArticles";

const emptyFilters = {
  query: "",
  dateFrom: "",
  dateTo: "",
  tags: [] as string[],
};

function tag(id: string, labels: Partial<Record<Locale, string>> = {}): ArticleTag {
  return {
    id,
    pt: labels.pt ?? id,
    en: labels.en ?? id,
    es: labels.es ?? id,
  };
}

function article(partial: {
  slug: string;
  date: string;
  tags: ArticleTag[];
  titles: Record<Locale, string>;
}): Article {
  return {
    slug: partial.slug,
    date: partial.date,
    tags: partial.tags,
    locales: {
      pt: {
        title: partial.titles.pt,
        description: "",
        markdown: `${partial.slug}.pt.md`,
      },
      en: {
        title: partial.titles.en,
        description: "",
        markdown: `${partial.slug}.en.md`,
      },
      es: {
        title: partial.titles.es,
        description: "",
        markdown: `${partial.slug}.es.md`,
      },
    },
  };
}

const a = article({
  slug: "a",
  date: "2026-09-24",
  tags: [tag("AI", { pt: "IA", es: "IA" }), tag("Product")],
  titles: { pt: "Alpha", en: "Alpha", es: "Alpha" },
});

const b = article({
  slug: "b",
  date: "2026-09-01",
  tags: [
    tag("AI", { pt: "IA", es: "IA" }),
    tag("Lideranca", { en: "Leadership", es: "Liderazgo" }),
  ],
  titles: { pt: "Beta", en: "Beta", es: "Beta" },
});

const articles = [b, a];

describe("filterArticles", () => {
  it("returns a then b for empty filters (date desc, slug asc)", () => {
    expect(filterArticles(articles, "en", emptyFilters)).toEqual([a, b]);
  });

  it("matches query beta only on the Beta title, case-insensitive, active locale only", () => {
    const aWithBetaInPt = article({
      slug: "a",
      date: "2026-09-24",
      tags: a.tags,
      titles: { pt: "Beta", en: "Alpha", es: "Alpha" },
    });

    expect(
      filterArticles([aWithBetaInPt, b], "en", {
        ...emptyFilters,
        query: "beta",
      }),
    ).toEqual([b]);
  });

  it("keeps articles on or after dateFrom", () => {
    expect(
      filterArticles(articles, "en", {
        ...emptyFilters,
        dateFrom: "2026-09-10",
      }),
    ).toEqual([a]);
  });

  it("keeps articles on or before dateTo", () => {
    expect(
      filterArticles(articles, "en", {
        ...emptyFilters,
        dateTo: "2026-09-10",
      }),
    ).toEqual([b]);
  });

  it("keeps articles inside an inclusive from/to range", () => {
    expect(
      filterArticles(articles, "en", {
        ...emptyFilters,
        dateFrom: "2026-09-01",
        dateTo: "2026-09-24",
      }),
    ).toEqual([a, b]);
  });

  it("returns articles that have AI when tags is [AI]", () => {
    expect(
      filterArticles(articles, "en", { ...emptyFilters, tags: ["AI"] }),
    ).toEqual([a, b]);
  });

  it("returns only articles that have both AI and Lideranca", () => {
    expect(
      filterArticles(articles, "en", {
        ...emptyFilters,
        tags: ["AI", "Lideranca"],
      }),
    ).toEqual([b]);
  });

  it("returns [] for query zzz", () => {
    expect(
      filterArticles(articles, "en", { ...emptyFilters, query: "zzz" }),
    ).toEqual([]);
  });
});

describe("formatArticleDate", () => {
  it('formats 2026-09-24 in pt as "24 de setembro de 2026"', () => {
    expect(formatArticleDate("2026-09-24", "pt")).toBe("24 de setembro de 2026");
  });
});

describe("collectTags", () => {
  it("returns first-seen tag order across articles", () => {
    expect(collectTags(articles).map((item) => item.id)).toEqual([
      "AI",
      "Lideranca",
      "Product",
    ]);
    expect(tagLabel(collectTags(articles)[1], "en")).toBe("Leadership");
    expect(tagLabel(collectTags(articles)[1], "es")).toBe("Liderazgo");
  });
});
