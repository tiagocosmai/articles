import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArticleFilters } from "../components/ArticleFilters";
import { ArticleList } from "../components/ArticleList";
import { collectTags } from "../content/filterArticles";
import type { LoadedContent } from "../types/content";

export function HomePage({ content }: { content: LoadedContent }) {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
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

  return (
    <div className="flex flex-col gap-8">
      <ArticleFilters
        query={query}
        date={date}
        selectedTags={tags}
        availableTags={collectTags(content.articles)}
        onQueryChange={setQuery}
        onDateChange={setDate}
        onToggleTag={toggleTag}
      />
      <ArticleList articles={content.articles} filters={{ query, date, tags }} />
    </div>
  );
}
