import { Link, useParams } from "react-router-dom";
import { FlashcardDeck } from "../components/FlashcardDeck";
import { MarkdownBody } from "../components/MarkdownBody";
import { formatArticleDate } from "../content/filterArticles";
import { useLocale } from "../context/LocaleContext";
import { useTheme } from "../context/ThemeContext";
import type { LoadedContent } from "../types/content";
import { NotFoundPage } from "./NotFoundPage";

export function ArticlePage({ content }: { content: LoadedContent }) {
  const { slug } = useParams();
  const { locale, t } = useLocale();
  const { mode } = useTheme();
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

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <time dateTime={article.date} className="text-sm opacity-80">
          {formatArticleDate(article.date, locale)}
        </time>
        <ul className="flex flex-wrap gap-2">
          {article.tags.map((tag) => (
            <li key={tag}>
              <Link
                to={`/?tag=${tag}`}
                className={`inline-block rounded-full border px-3 py-1 text-sm ${tagClass}`}
              >
                #{tag}
              </Link>
            </li>
          ))}
        </ul>
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
    </article>
  );
}
