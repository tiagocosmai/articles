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
            <ArticleList items={items} filters={{ ...emptyFilters, dateFrom: "2026-09-01" }} />
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
