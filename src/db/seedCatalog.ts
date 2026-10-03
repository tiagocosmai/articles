import { eq } from "drizzle-orm";
import type { LoadedContent, Locale } from "../types/content";
import { articleLocales, articleTags, articles, flashcards, tagLocales, tags } from "./schema";
import type { TestDatabase } from "./testDb";

const locales: Locale[] = ["pt", "en", "es"];

export async function seedCatalog(db: TestDatabase, content: LoadedContent): Promise<void> {
  await db.transaction(async (tx) => {
    const tagIdByCode = new Map<string, string>();
    for (const article of content.articles) {
      for (const tag of article.tags) {
        if (tagIdByCode.has(tag.id)) continue;
        const [row] = await tx
          .insert(tags)
          .values({ code: tag.id })
          .onConflictDoUpdate({ target: tags.code, set: { code: tag.id } })
          .returning();
        tagIdByCode.set(tag.id, row.id);
        for (const locale of locales) {
          await tx
            .insert(tagLocales)
            .values({ tagId: row.id, locale, label: tag[locale] })
            .onConflictDoUpdate({
              target: [tagLocales.tagId, tagLocales.locale],
              set: { label: tag[locale] },
            });
        }
      }
    }

    for (const article of content.articles) {
      const [row] = await tx
        .insert(articles)
        .values({ slug: article.slug, publishedOn: article.date })
        .onConflictDoUpdate({
          target: articles.slug,
          set: { publishedOn: article.date, updatedAt: new Date() },
        })
        .returning();

      await tx.delete(articleLocales).where(eq(articleLocales.articleId, row.id));
      await tx.delete(articleTags).where(eq(articleTags.articleId, row.id));
      await tx.delete(flashcards).where(eq(flashcards.articleId, row.id));

      await tx.insert(articleLocales).values(
        locales.map((locale) => ({
          articleId: row.id,
          locale,
          title: article.locales[locale].title,
          description: article.locales[locale].description,
          body: content.markdown[article.locales[locale].markdown] ?? "",
        })),
      );

      if (article.tags.length > 0) {
        await tx.insert(articleTags).values(
          article.tags.map((tag, position) => ({
            articleId: row.id,
            tagId: tagIdByCode.get(tag.id) ?? "",
            position,
          })),
        );
      }

      const cards = locales.flatMap((locale) =>
        (content.flashcards[`${article.slug}.${locale}.json`] ?? []).map((card, position) => ({
          articleId: row.id,
          locale,
          code: card.id,
          front: card.front,
          back: card.back,
          position,
        })),
      );
      if (cards.length > 0) await tx.insert(flashcards).values(cards);
    }
  });
}
