import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArticleFilters } from "../components/ArticleFilters";
import { ArticleList } from "../components/ArticleList";
import { BlogColumns } from "../components/BlogColumns";
import { collectTags } from "../content/filterArticles";
import { repeatArticles } from "../content/listArticles";
import type { LoadedContent } from "../types/content";

export function HomePage({ content }: { content: LoadedContent }) {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [dateFrom, setDateFrom] = useState(() => searchParams.get("from") ?? "");
  const [dateTo, setDateTo] = useState(() => searchParams.get("to") ?? "");
  const [tags, setTags] = useState<string[]>(() => {
    const tag = searchParams.get("tag");
    return tag ? [tag] : [];
  });

  function toggleTag(tag: string) {
    setTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag],
    );
  }

  const copies = import.meta.env.MODE === "development" ? 15 : 1;
  const items = repeatArticles(content.articles, copies);

  return (
    <BlogColumns
      content={<ArticleList items={items} filters={{ query, dateFrom, dateTo, tags }} />}
      filters={
        <ArticleFilters
          query={query}
          dateFrom={dateFrom}
          dateTo={dateTo}
          selectedTags={tags}
          availableTags={collectTags(content.articles)}
          onQueryChange={setQuery}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onToggleTag={toggleTag}
        />
      }
    />
  );
}
