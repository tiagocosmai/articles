import type { Flashcard, LoadedContent, Locale } from "../types/content";
import { readPublishedCatalog } from "../db/catalog";
import type { TestDatabase } from "../db/testDb";

const locales: Locale[] = ["pt", "en", "es"];

export async function getArticleList(db: TestDatabase): Promise<{ status: 200; body: LoadedContent }> {
  return { status: 200, body: await readPublishedCatalog(db) };
}

export async function getArticleBySlug(db: TestDatabase, slug: string) {
  const catalog = await readPublishedCatalog(db);
  const article = catalog.articles.find((item) => item.slug === slug);
  if (!article) return { status: 404 as const, body: { message: "not found" } };

  const markdown: Record<string, string> = {};
  const cards: Record<string, Flashcard[]> = {};
  for (const locale of locales) {
    const filename = article.locales[locale].markdown;
    markdown[filename] = catalog.markdown[filename];
    const cardName = `${article.slug}.${locale}.json`;
    if (cardName in catalog.flashcards) cards[cardName] = catalog.flashcards[cardName];
  }

  return { status: 200 as const, body: { article, markdown, flashcards: cards } };
}
