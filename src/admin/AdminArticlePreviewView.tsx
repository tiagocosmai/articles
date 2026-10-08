"use client";

import { FlashcardDeck } from "../components/FlashcardDeck";
import { MarkdownBody } from "../components/MarkdownBody";
import { formatArticleDate, tagLabel } from "../content/filterArticles";
import { useLocale } from "../context/LocaleContext";
import type { AdminArticlePreview } from "../api/adminArticlePreview";

const stateLabel = {
  live: "No ar",
  hidden: "Oculto",
  empty: "Sem corpo",
  scheduled: "Agendado",
} as const;

export function AdminArticlePreviewView({ preview }: { preview: AdminArticlePreview }) {
  const { locale, t } = useLocale();
  const { article } = preview;
  const filename = article.locales[locale].markdown;
  const markdown = preview.markdown[filename];
  const cards = preview.flashcards[filename.replace(/\.md$/, ".json")];
  const title = article.locales[locale].title || article.slug;

  return (
    <main className="admin-panel min-h-full bg-surface-dark px-4 py-6 text-white [color-scheme:dark]">
      <p className="mb-4 rounded-lg border border-brand/40 bg-brand/10 px-3 py-2 text-sm">
        Visualização administrativa — {stateLabel[preview.state]}. Comentários, reações e compartilhamento não
        aparecem aqui.
      </p>
      <a href="/admin/posts" className="mb-6 inline-block underline">
        Voltar para posts
      </a>
      <article className="flex max-w-3xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm opacity-80">{article.locales[locale].description}</p>
          <time dateTime={article.date} className="text-sm opacity-80">
            {formatArticleDate(article.date, locale)}
          </time>
        </header>
        {markdown.trim() ? <MarkdownBody markdown={markdown} /> : <p>{t("missing_content")}</p>}
        {Array.isArray(cards) ? (
          <FlashcardDeck cards={cards} />
        ) : markdown.trim() ? (
          <p>{t("missing_content")}</p>
        ) : null}
        {article.tags.length > 0 ? (
          <ul aria-label={t("article_tags")} className="flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <li key={tag.id} className="rounded-full border border-white/30 px-3 py-1 text-sm">
                #{tagLabel(tag, locale)}
              </li>
            ))}
          </ul>
        ) : null}
      </article>
    </main>
  );
}
