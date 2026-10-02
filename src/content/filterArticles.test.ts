import type { Article, Locale } from "../types/content";
import {
  collectTags,
  countArticlesForTag,
  filterArticles,
  formatArticleDate,
  tagBadgeText,
} from "./filterArticles";

const emptyFilters = {
  query: "",
  dateFrom: "",
  dateTo: "",
  tags: [] as string[],
};

function article(partial: {
  slug: string;
  date: string;
  tags: string[];
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
  tags: ["AI", "Product"],
  titles: { pt: "Alpha", en: "Alpha", es: "Alpha" },
});

const b = article({
  slug: "b",
  date: "2026-09-01",
  tags: ["AI", "Lideranca"],
  titles: { pt: "Beta", en: "Beta", es: "Beta" },
});

const articles = [b, a];

describe("filterArticles", () => {
  it("preserves input order", () => {
    expect(filterArticles(articles, "en", emptyFilters)).toEqual([b, a]);
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
    ).toEqual([b, a]);
  });

  it("returns articles that have AI when tags is [AI]", () => {
    expect(
      filterArticles(articles, "en", { ...emptyFilters, tags: ["AI"] }),
    ).toEqual([b, a]);
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

describe("countArticlesForTag", () => {
  it("counts articles that already match and also have the tag", () => {
    expect(countArticlesForTag(articles, "en", emptyFilters, "AI")).toBe(2);
    expect(countArticlesForTag(articles, "en", emptyFilters, "Product")).toBe(1);
    expect(
      countArticlesForTag(articles, "en", { ...emptyFilters, query: "beta" }, "Product"),
    ).toBe(0);
  });

  it("keeps an already selected tag in the count", () => {
    expect(countArticlesForTag(articles, "en", { ...emptyFilters, tags: ["AI"] }, "AI")).toBe(2);
    expect(
      countArticlesForTag(articles, "en", { ...emptyFilters, tags: ["AI"] }, "Product"),
    ).toBe(1);
  });
});

describe("tagBadgeText", () => {
  it("hides zero, shows the number, and caps above 99", () => {
    expect(tagBadgeText(0)).toBeNull();
    expect(tagBadgeText(1)).toBe("1");
    expect(tagBadgeText(99)).toBe("99");
    expect(tagBadgeText(100)).toBe("+99");
  });
});

describe("collectTags", () => {
  it("returns first-seen tag order across articles", () => {
    expect(collectTags(articles)).toEqual(["AI", "Lideranca", "Product"]);
  });
});
