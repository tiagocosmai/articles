import type { Article, Locale } from "../types/content";
import { sortArticles } from "./listArticles";

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
