import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LocaleProvider } from "../context/LocaleContext";
import { ThemeProvider } from "../context/ThemeContext";
import type { Article, ArticleTag, Locale } from "../types/content";
import { ArticleFilters } from "./ArticleFilters";

function tag(id: string): ArticleTag {
  return { id, pt: id, en: id, es: id };
}

function article(slug: string, tags: string[], title: string): Article {
  const locale = (name: string): { title: string; description: string; markdown: string } => ({
    title: name,
    description: "",
    markdown: `${slug}.md`,
  });
  const titles: Record<Locale, ReturnType<typeof locale>> = {
    pt: locale(title),
    en: locale(title),
    es: locale(title),
  };
  return { slug, date: "2026-09-24", tags: tags.map(tag), locales: titles };
}

const articles = [
  article("a", ["AI", "Product"], "Alpha"),
  article("b", ["AI", "Lideranca"], "Beta"),
];

function renderFilters(query = "", selectedTags: string[] = []) {
  return render(
    <MemoryRouter>
      <LocaleProvider>
        <ThemeProvider>
          <ArticleFilters
            articles={articles}
            query={query}
            dateFrom=""
            dateTo=""
            selectedTags={selectedTags}
            availableTags={["AI", "Product", "Lideranca"].map(tag)}
            onQueryChange={() => {}}
            onDateFromChange={() => {}}
            onDateToChange={() => {}}
            onToggleTag={() => {}}
          />
        </ThemeProvider>
      </LocaleProvider>
    </MemoryRouter>,
  );
}

describe("ArticleFilters tag badges", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("articles-locale", "pt");
  });

  it("disables an unselected tag with no matching articles and keeps a selected one clickable", () => {
    const { rerender } = renderFilters("beta");

    expect(screen.getByRole("button", { name: "#AI" })).toBeEnabled();
    expect(screen.getAllByText("1", { selector: '[aria-hidden="true"]' })).toHaveLength(2);
    const product = screen.getByText("#Product");
    expect(product).toHaveAttribute("aria-disabled", "true");
    expect(product.tagName).toBe("SPAN");

    rerender(
      <MemoryRouter>
        <LocaleProvider>
          <ThemeProvider>
            <ArticleFilters
              articles={articles}
              query="beta"
              dateFrom=""
              dateTo=""
              selectedTags={["Product"]}
              availableTags={["AI", "Product", "Lideranca"].map(tag)}
              onQueryChange={() => {}}
              onDateFromChange={() => {}}
              onDateToChange={() => {}}
              onToggleTag={() => {}}
            />
          </ThemeProvider>
        </LocaleProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "#Product" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "#Product" })).toHaveAttribute("aria-pressed", "true");
  });
});
