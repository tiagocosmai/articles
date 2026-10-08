# Article List Scroll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reveal the home article list in batches of 10, with a filtered-versus-total count on the left and date/title sort on the right.

**Architecture:** `filterArticles` only decides membership and keeps input order. `listArticles.ts` sorts, repeats items for the dev server, and slices the revealed window. `ArticleList` owns the sort controls, the revealed count, and the scroll sentinel. `HomePage` still owns search, dates, and tags, and repeats the catalog 15 times only when Vite's mode is `development`.

**Tech Stack:** React 19, Vite 6, Vitest 3, Testing Library, Tailwind.

## Global Constraints

- `LIST_PAGE_SIZE = 10` on every viewport. No numbered pages. No "mostrar mais" button. No virtualization.
- Count text, with `{matched}` and `{total}` replaced in the component: pt `{matched} de {total} artigos`; en `{matched} of {total} articles`; es `{matched} de {total} artículos`.
- `matched` is how many articles pass search, date, and tags. `total` is the length of the array handed to the list, not how many cards are already revealed.
- With the real two-article catalog and no filters, the line reads `2 de 2 artigos`. With a filter that matches nothing, it reads `0 de 2 artigos` and the existing empty message stays.
- `t()` still returns the raw string.
- Two selects. Opening state is date, descending. Field options: pt Data/Título, en Date/Title, es Fecha/Título. Direction options: pt Crescente/Decrescente, en Ascending/Descending, es Ascendente/Descendente. Visible labels: pt Ordenar por / Sentido, en Sort by / Direction, es Ordenar por / Sentido.
- Date comparison uses the `YYYY-MM-DD` string. Title comparison uses `localeCompare` with `pt-BR`, `en`, and `es`. Direction flips only that primary comparison.
- Date tie-break, both directions: slug ascending. Title tie-break, both directions: date newest first, then slug ascending.
- Sort state stays in the list. It is not written to the URL.
- Changing search, date, tags, field, direction, or locale sets the revealed count back to 10. Fewer than 10 matches shows all of them. The sentinel does not request another batch once everything matched is visible.
- If `typeof IntersectionObserver !== "function"`, show the whole filtered result.
- Repeat each article 15 times only when `import.meta.env.MODE === "development"`. Vitest (`MODE === "test"`) and the production build use the real catalog. Do not duplicate markdown files or `data/articles.json`.
- `repeatArticles` returns `{ key, article }[]`. When `copies === 1`, `key` is the slug. Otherwise `key` is `${slug}-${copy}`. The card still links to `/${article.slug}`.
- The article page does not render this bar or this scroll window.
- Tags on this branch are `string[]`. Do not change `collectTags`, the catalog, or the tag shape. `HomePage` keeps calling `collectTags(content.articles)` on the real catalog.
- Test command: `npx vitest run --exclude .worktrees/** <files>`. A full run is `npx vitest run --exclude .worktrees/**`.
- Do not run `git config`. Commit with `GIT_AUTHOR_NAME=Tiago Cosmai` `GIT_AUTHOR_EMAIL=tiagocosmai@gmail.com` `GIT_COMMITTER_NAME=Tiago Cosmai` `GIT_COMMITTER_EMAIL=tiagocosmai@gmail.com`.

## File map

- Modify `src/content/filterArticles.ts` — `filterArticles` stops sorting.
- Modify `src/content/filterArticles.test.ts` — expect input order.
- Create `src/content/listArticles.ts` — sort, repeat, reveal, count formatting.
- Create `src/content/listArticles.test.ts` — those pure functions.
- Modify `src/i18n/ui.ts` — count and sort strings in pt, en, and es.
- Modify `src/components/ArticleList.tsx` — toolbar, sort state, window, sentinel.
- Create `src/components/ArticleList.test.tsx` — count, order, window, reset, missing observer.
- Modify `src/pages/HomePage.tsx` — pass repeated items in development only.
- Modify `src/pages/HomePage.test.tsx` — `2 de 2 artigos` and newest-first order.
- Modify `src/pages/ArticlePage.test.tsx` — article page has no sort control.

---

### Task 1: Filter preserves input order

**Files:**
- Modify: `src/content/filterArticles.ts` (the `.slice().sort(...)` tail of `filterArticles`)
- Test: `src/content/filterArticles.test.ts`

**Interfaces:**
- Consumes: existing `filterArticles(articles, locale, filters): Article[]`
- Produces: `filterArticles` returns matches in input order, same object references, and no longer sorts by date.

- [ ] **Step 1: Write the failing test**

In `src/content/filterArticles.test.ts`, replace the empty-filter test and the two expectations that currently depend on date ordering.

```ts
it("preserves input order", () => {
  expect(filterArticles(articles, "en", emptyFilters)).toEqual([b, a]);
});
```

The inclusive range test must expect `[b, a]`. The `tags: ["AI"]` test must expect `[b, a]`. Leave the single-article expectations (`[a]`, `[b]`, `[]`) as they are.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --exclude .worktrees/** src/content/filterArticles.test.ts`

Expected: FAIL. Empty filters still return `[a, b]` because `filterArticles` sorts by date descending.

- [ ] **Step 3: Write the minimal implementation**

In `src/content/filterArticles.ts`, delete `.slice().sort(...)` so `filterArticles` returns the `.filter(...)` array directly.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --exclude .worktrees/** src/content/filterArticles.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/content/filterArticles.ts src/content/filterArticles.test.ts
GIT_AUTHOR_NAME="Tiago Cosmai" GIT_AUTHOR_EMAIL="tiagocosmai@gmail.com" GIT_COMMITTER_NAME="Tiago Cosmai" GIT_COMMITTER_EMAIL="tiagocosmai@gmail.com" \
  git commit -m "Keep filtered articles in input order."
```

---

### Task 2: Sort articles by date or title

**Files:**
- Create: `src/content/listArticles.ts`
- Test: `src/content/listArticles.test.ts`

**Interfaces:**
- Consumes: `Article` and `Locale` from `src/types/content.ts`
- Produces:

```ts
export type ArticleSort = {
  field: "date" | "title";
  direction: "asc" | "desc";
};

export function sortArticles(
  articles: Article[],
  locale: Locale,
  sort: ArticleSort,
): Article[];
```

- [ ] **Step 1: Write the failing test**

Create `src/content/listArticles.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --exclude .worktrees/** src/content/listArticles.test.ts`

Expected: FAIL with `sortArticles` not defined.

- [ ] **Step 3: Write the minimal implementation**

Create `src/content/listArticles.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --exclude .worktrees/** src/content/listArticles.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/content/listArticles.ts src/content/listArticles.test.ts
GIT_AUTHOR_NAME="Tiago Cosmai" GIT_AUTHOR_EMAIL="tiagocosmai@gmail.com" GIT_COMMITTER_NAME="Tiago Cosmai" GIT_COMMITTER_EMAIL="tiagocosmai@gmail.com" \
  git commit -m "Sort articles by date or by the active title."
```

---

### Task 3: Repeat, reveal, and format the count

**Files:**
- Modify: `src/content/listArticles.ts`
- Test: `src/content/listArticles.test.ts`

**Interfaces:**
- Consumes: `ArticleSort` and `sortArticles` from Task 2. `ArticleFilters` from `src/content/filterArticles.ts`.
- Produces:

```ts
export const LIST_PAGE_SIZE = 10;

export type ListedArticle = { key: string; article: Article };

export function repeatArticles(articles: Article[], copies: number): ListedArticle[];

export function filterListedArticles(
  items: ListedArticle[],
  locale: Locale,
  filters: ArticleFilters,
): ListedArticle[];

export function sortListedArticles(
  items: ListedArticle[],
  locale: Locale,
  sort: ArticleSort,
): ListedArticle[];

export function revealArticles<T>(items: T[], shown: number): T[];

export function formatArticleCount(template: string, matched: number, total: number): string;
```

`filterListedArticles` keeps every listed item whose `article` reference is in the `filterArticles` result. `repeatArticles` must reuse the same `Article` object for each copy so that identity check works. `sortListedArticles` compares fields and must not collapse copies that share one object.

- [ ] **Step 1: Write the failing test**

Append to `src/content/listArticles.test.ts`:

```ts
import type { ArticleFilters } from "./filterArticles";
import {
  filterListedArticles,
  formatArticleCount,
  LIST_PAGE_SIZE,
  repeatArticles,
  revealArticles,
  sortListedArticles,
} from "./listArticles";

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
```

`older` has the pt title `Beta` and `newer` has `Alpha`, so the query `alpha` keeps the two newer copies. `repeatArticles` emits `older, newer, older, newer`. A stable date-ascending sort keeps equal items in that relative order, so the keys are `older-0`, `older-1`, `newer-0`, `newer-1`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --exclude .worktrees/** src/content/listArticles.test.ts`

Expected: FAIL because `repeatArticles` is not exported.

- [ ] **Step 3: Write the minimal implementation**

Add to `src/content/listArticles.ts`:

```ts
import { filterArticles, type ArticleFilters } from "./filterArticles";

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
  return items.slice().sort((left, right) => compareArticles(left.article, right.article, locale, sort));
}

export function revealArticles<T>(items: T[], shown: number): T[] {
  return items.slice(0, shown);
}

export function formatArticleCount(template: string, matched: number, total: number): string {
  return template.replaceAll("{matched}", String(matched)).replaceAll("{total}", String(total));
}
```

Keep `compareArticles` in the same file so `sortListedArticles` can call it. `sortArticles` stays as written in Task 2.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run --exclude .worktrees/** src/content/listArticles.test.ts src/content/filterArticles.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/content/listArticles.ts src/content/listArticles.test.ts
GIT_AUTHOR_NAME="Tiago Cosmai" GIT_AUTHOR_EMAIL="tiagocosmai@gmail.com" GIT_COMMITTER_NAME="Tiago Cosmai" GIT_COMMITTER_EMAIL="tiagocosmai@gmail.com" \
  git commit -m "Repeat, sort, and reveal listed articles in pages of 10."
```

---

### Task 4: Toolbar, scroll window, and the dev catalog

**Files:**
- Modify: `src/i18n/ui.ts`
- Modify: `src/components/ArticleList.tsx`
- Create: `src/components/ArticleList.test.tsx`
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/HomePage.test.tsx`
- Modify: `src/pages/ArticlePage.test.tsx`

**Interfaces:**
- Consumes: `ListedArticle`, `LIST_PAGE_SIZE`, `filterListedArticles`, `sortListedArticles`, `revealArticles`, `formatArticleCount`, `repeatArticles`, and `ArticleSort` from `src/content/listArticles.ts`. `ArticleFilters` from `src/content/filterArticles.ts`.
- Produces: `ArticleList({ items, filters })` where `items` is `ListedArticle[]`. Default sort is `{ field: "date", direction: "desc" }`.

- [ ] **Step 1: Write the failing test**

Add these keys to every locale object in `src/i18n/ui.ts` before writing the component test, so the test fails on missing UI behavior rather than on missing copy. The test still fails until `ArticleList` renders them.

pt:

```ts
article_count: "{matched} de {total} artigos",
sort_field_label: "Ordenar por",
sort_direction_label: "Sentido",
sort_date: "Data",
sort_title: "Título",
sort_asc: "Crescente",
sort_desc: "Decrescente",
```

en:

```ts
article_count: "{matched} of {total} articles",
sort_field_label: "Sort by",
sort_direction_label: "Direction",
sort_date: "Date",
sort_title: "Title",
sort_asc: "Ascending",
sort_desc: "Descending",
```

es:

```ts
article_count: "{matched} de {total} artículos",
sort_field_label: "Ordenar por",
sort_direction_label: "Sentido",
sort_date: "Fecha",
sort_title: "Título",
sort_asc: "Ascendente",
sort_desc: "Descendente",
```

Create `src/components/ArticleList.test.tsx`:

```tsx
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { repeatArticles } from "../content/listArticles";
import { LocaleProvider } from "../context/LocaleContext";
import { ThemeProvider } from "../context/ThemeContext";
import type { Article } from "../types/content";
import { ArticleList } from "./ArticleList";

function article(index: number): Article {
  const day = String(28 - index).padStart(2, "0");
  const title = `Titulo ${String(index).padStart(2, "0")}`;
  return {
    slug: `slug-${index}`,
    date: `2026-09-${day}`,
    tags: ["AI"],
    locales: {
      pt: { title, description: "", markdown: "a.pt.md" },
      en: { title, description: "", markdown: "a.en.md" },
      es: { title, description: "", markdown: "a.es.md" },
    },
  };
}

const articles = Array.from({ length: 12 }, (_, index) => article(index));
const items = repeatArticles(articles, 1);
const emptyFilters = { query: "", dateFrom: "", dateTo: "", tags: [] as string[] };

function renderList(filters = emptyFilters) {
  return render(
    <MemoryRouter>
      <LocaleProvider>
        <ThemeProvider>
          <ArticleList items={items} filters={filters} />
        </ThemeProvider>
      </LocaleProvider>
    </MemoryRouter>,
  );
}

describe("ArticleList", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("articles-locale", "pt");
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("shows the filtered count and the first 10 cards, newest first", () => {
    class FakeObserver {
      callback: IntersectionObserverCallback;
      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
      }
      observe() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    vi.stubGlobal("IntersectionObserver", FakeObserver);

    renderList();

    expect(screen.getByText("12 de 12 artigos")).toBeInTheDocument();
    const headings = screen.getAllByRole("heading");
    expect(headings).toHaveLength(10);
    expect(headings[0]).toHaveTextContent("Titulo 00");
    expect(headings[9]).toHaveTextContent("Titulo 09");
    expect(screen.queryByRole("heading", { name: "Titulo 10" })).not.toBeInTheDocument();
  });

  it("reveals the next batch when the sentinel intersects and resets after a sort change", async () => {
    const user = userEvent.setup();
    let observer: { callback: IntersectionObserverCallback } | undefined;
    class FakeObserver {
      callback: IntersectionObserverCallback;
      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
        observer = this;
      }
      observe() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    vi.stubGlobal("IntersectionObserver", FakeObserver);

    renderList();
    act(() => {
      observer?.callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    expect(await screen.findByRole("heading", { name: "Titulo 11" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading")).toHaveLength(12);

    await user.selectOptions(screen.getByLabelText("Sentido"), "asc");

    expect(screen.getAllByRole("heading")).toHaveLength(10);
    expect(screen.getByRole("heading", { name: "Titulo 11" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Titulo 00" })).not.toBeInTheDocument();
  });

  it("returns to the first batch when the date filter changes", () => {
    let observer: { callback: IntersectionObserverCallback } | undefined;
    class FakeObserver {
      callback: IntersectionObserverCallback;
      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
        observer = this;
      }
      observe() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    vi.stubGlobal("IntersectionObserver", FakeObserver);

    const { rerender } = renderList();
    act(() => {
      observer?.callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });
    expect(screen.getAllByRole("heading")).toHaveLength(12);

    rerender(
      <MemoryRouter>
        <LocaleProvider>
          <ThemeProvider>
            <ArticleList
              items={items}
              filters={{ ...emptyFilters, dateFrom: "2026-09-01" }}
            />
          </ThemeProvider>
        </LocaleProvider>
      </MemoryRouter>,
    );

    expect(screen.getAllByRole("heading")).toHaveLength(10);
    expect(screen.getByText("12 de 12 artigos")).toBeInTheDocument();
  });

  it("shows every match when the observer is missing", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    renderList();
    expect(screen.getAllByRole("heading")).toHaveLength(12);
  });

  it("keeps the zero count and the empty message", () => {
    renderList({ ...emptyFilters, query: "zzz" });
    expect(screen.getByText("0 de 12 artigos")).toBeInTheDocument();
    expect(screen.getByText("Nenhum artigo corresponde à busca.")).toBeInTheDocument();
  });
});
```

Date ascending puts the oldest card first. `article(11)` is `2026-09-17` and `article(0)` is `2026-09-28`, so after reset the first visible heading is `Titulo 11` and `Titulo 00` is outside the first 10. That matches the reset assertion.

In `src/pages/HomePage.test.tsx`, inside `lists the article in Portuguese...`, after the Portuguese heading assertion, add:

```tsx
expect(screen.getByText("2 de 2 artigos")).toBeInTheDocument();
const headings = screen.getAllByRole("heading");
expect(headings[0]).toHaveTextContent(
  "Desenvolvedores, analistas e DBAs: escravos da tecnologia na era da IA?",
);
expect(headings[1]).toHaveTextContent(PT_TITLE);
```

After the English `zzz` search finds `No articles match.`, add:

```tsx
expect(screen.getByText("0 of 2 articles")).toBeInTheDocument();
```

In `src/pages/ArticlePage.test.tsx`, add:

```tsx
it("does not show the list count or sort controls", () => {
  renderAt("/o-agente-secreto");
  expect(screen.queryByText("2 de 2 artigos")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Ordenar por")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run --exclude .worktrees/** src/components/ArticleList.test.tsx src/pages/HomePage.test.tsx src/pages/ArticlePage.test.tsx`

Expected: FAIL because `ArticleList` still expects `articles` and does not render the count.

- [ ] **Step 3: Write the minimal implementation**

Replace `src/components/ArticleList.tsx` with:

```tsx
import { useEffect, useRef, useState } from "react";
import type { ArticleFilters as Filters } from "../content/filterArticles";
import {
  filterListedArticles,
  formatArticleCount,
  LIST_PAGE_SIZE,
  sortListedArticles,
  revealArticles,
  type ArticleSort,
  type ListedArticle,
} from "../content/listArticles";
import { useLocale } from "../context/LocaleContext";
import { ArticleCard } from "./ArticleCard";

export function ArticleList({
  items,
  filters,
}: {
  items: ListedArticle[];
  filters: Filters;
}) {
  const { locale, t } = useLocale();
  const [field, setField] = useState<ArticleSort["field"]>("date");
  const [direction, setDirection] = useState<ArticleSort["direction"]>("desc");
  const [shown, setShown] = useState(LIST_PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const canObserve = typeof IntersectionObserver === "function";

  useEffect(() => {
    setShown(LIST_PAGE_SIZE);
  }, [filters.query, filters.dateFrom, filters.dateTo, filters.tags, field, direction, locale]);

  const matched = sortListedArticles(
    filterListedArticles(items, locale, filters),
    locale,
    { field, direction },
  );
  const visible = revealArticles(matched, canObserve ? shown : matched.length);
  const hasMore = canObserve && visible.length < matched.length;

  useEffect(() => {
    if (!hasMore || !sentinelRef.current) {
      return;
    }
    const node = sentinelRef.current;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setShown((current) => current + LIST_PAGE_SIZE);
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, visible.length]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p>{formatArticleCount(t("article_count"), matched.length, items.length)}</p>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm">
            {t("sort_field_label")}
            <select
              value={field}
              onChange={(event) => setField(event.target.value as ArticleSort["field"])}
              className="rounded-md border px-2 py-1"
            >
              <option value="date">{t("sort_date")}</option>
              <option value="title">{t("sort_title")}</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            {t("sort_direction_label")}
            <select
              value={direction}
              onChange={(event) =>
                setDirection(event.target.value as ArticleSort["direction"])
              }
              className="rounded-md border px-2 py-1"
            >
              <option value="asc">{t("sort_asc")}</option>
              <option value="desc">{t("sort_desc")}</option>
            </select>
          </label>
        </div>
      </div>
      {matched.length === 0 ? (
        <p>{t("empty_results")}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {visible.map((item) => (
            <li key={item.key}>
              <ArticleCard article={item.article} />
            </li>
          ))}
        </ul>
      )}
      {hasMore ? <div ref={sentinelRef} aria-hidden="true" /> : null}
    </div>
  );
}
```

`filters.tags` in the reset effect must be the same array identity the parent stores. `HomePage` already keeps `tags` in state. Do not allocate a new tags array during render.

In `src/pages/HomePage.tsx`, build the listed items and pass `items`:

```tsx
import { repeatArticles } from "../content/listArticles";

const copies = import.meta.env.MODE === "development" ? 15 : 1;
const items = repeatArticles(content.articles, copies);
```

```tsx
<ArticleList items={items} filters={{ query, dateFrom, dateTo, tags }} />
```

Leave `collectTags(content.articles)` on the real catalog.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run --exclude .worktrees/** src/components/ArticleList.test.tsx src/pages/HomePage.test.tsx src/pages/ArticlePage.test.tsx src/content/listArticles.test.ts src/content/filterArticles.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/i18n/ui.ts src/components/ArticleList.tsx src/components/ArticleList.test.tsx src/pages/HomePage.tsx src/pages/HomePage.test.tsx src/pages/ArticlePage.test.tsx
GIT_AUTHOR_NAME="Tiago Cosmai" GIT_AUTHOR_EMAIL="tiagocosmai@gmail.com" GIT_COMMITTER_NAME="Tiago Cosmai" GIT_COMMITTER_EMAIL="tiagocosmai@gmail.com" \
  git commit -m "Reveal the article list in batches and show the filtered count."
```
