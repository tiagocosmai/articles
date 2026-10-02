import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BlogLink } from "../components/BlogLink";
import { ArticleFilters } from "../components/ArticleFilters";
import { ArticleShare } from "../components/ArticleShare";
import { BlogColumns } from "../components/BlogColumns";
import { FlashcardDeck } from "../components/FlashcardDeck";
import { MarkdownBody } from "../components/MarkdownBody";
import { collectTags, formatArticleDate, tagLabel } from "../content/filterArticles";
import { useLocale } from "../context/LocaleContext";
import { useTheme } from "../context/ThemeContext";
import { blogNavigationHref } from "../share/articleShareUrl";
import type { LoadedContent } from "../types/content";
import { NotFoundPage } from "./NotFoundPage";

export function ArticlePage({ content }: { content: LoadedContent }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { locale, t } = useLocale();
  const { mode } = useTheme();
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const article = content.articles.find((item) => item.slug === slug);

  if (!article) {
    return <NotFoundPage />;
  }

  const filename = article.locales[locale].markdown;
  const markdown = content.markdown[filename];
  const cards = content.flashcards[filename.replace(/\.md$/, ".json")];
  const tagClass =
    mode === "dark"
      ? "border-brand/40 text-brand"
      : "border-brand-light/40 text-brand-light";

  const backClass =
    mode === "dark"
      ? "border-brand/40 text-brand"
      : "border-brand-light/40 text-brand-light";

  function listingSearch(next: {
    query?: string;
    dateFrom?: string;
    dateTo?: string;
    tag?: string;
  }) {
    const params = new URLSearchParams();
    const q = next.query ?? query;
    const from = next.dateFrom ?? dateFrom;
    const to = next.dateTo ?? dateTo;
    if (q) {
      params.set("q", q);
    }
    if (from) {
      params.set("from", from);
    }
    if (to) {
      params.set("to", to);
    }
    if (next.tag) {
      params.set("tag", next.tag);
    }
    return `/?${params.toString()}`;
  }

  function openListing(next: {
    query?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const destination = blogNavigationHref(listingSearch(next), undefined, locale);
    if (destination.external) {
      window.top?.location.assign(destination.href);
      return;
    }
    navigate(destination.href);
  }

  return (
    <BlogColumns
      filters={
        <form
          onSubmit={(event) => {
            event.preventDefault();
            openListing({});
          }}
        >
          <ArticleFilters
            articles={content.articles}
            query={query}
            dateFrom={dateFrom}
            dateTo={dateTo}
            selectedTags={[]}
            availableTags={collectTags(content.articles)}
            onQueryChange={setQuery}
            onDateFromChange={(value) => {
              setDateFrom(value);
              openListing({ dateFrom: value });
            }}
            onDateToChange={(value) => {
              setDateTo(value);
              openListing({ dateTo: value });
            }}
            tagHref={(tag) => listingSearch({ tag })}
          />
        </form>
      }
      content={
        <article className="flex flex-col gap-6">
          <BlogLink
            to="/"
            className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold ${backClass}`}
          >
            <span aria-hidden="true">←</span>
            {t("back_blog")}
          </BlogLink>
          <header className="flex items-center justify-between gap-3">
            <time dateTime={article.date} className="text-sm opacity-80">
              {formatArticleDate(article.date, locale)}
            </time>
            <ArticleShare
              slug={article.slug}
              title={article.locales[locale].title}
              description={article.locales[locale].description}
              date={article.date}
              markdown={typeof markdown === "string" ? markdown : ""}
            />
          </header>
          {typeof markdown === "string" ? (
            <MarkdownBody markdown={markdown} />
          ) : (
            <p>{t("missing_content")}</p>
          )}
          {Array.isArray(cards) ? (
            <FlashcardDeck cards={cards} />
          ) : typeof markdown === "string" ? (
            <p>{t("missing_content")}</p>
          ) : null}
          <ul aria-label={t("article_tags")} className="flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <li
                key={tag.id}
                className={`rounded-full border px-3 py-1 text-sm ${tagClass}`}
              >
                #{tagLabel(tag, locale)}
              </li>
            ))}
          </ul>
        </article>
      }
    />
  );
}
