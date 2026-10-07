import { and, eq } from "drizzle-orm";
import type { LoadedContent, Locale } from "../types/content";
import { articleLocales, articleSlugRedirects, articleTags, articles, flashcards, tagLocales, tags } from "./schema";
import type { TestDatabase } from "./testDb";

const locales: Locale[] = ["pt", "en", "es"];

export async function seedCatalog(db: TestDatabase, content: LoadedContent): Promise<void> {
  await db.transaction(async (tx) => {
    const tagIdByCode = new Map<string, string>();
    async function ensureTag(tag: LoadedContent["articles"][number]["tags"][number]) {
      const known = tagIdByCode.get(tag.id);
      if (known) return known;
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
      return row.id;
    }

    const existing = await tx.select().from(articles);
    const redirects = await tx.select().from(articleSlugRedirects);
    const idByOldSlug = new Map(redirects.map((row) => [row.slug, row.articleId]));

    for (const article of content.articles) {
      const current =
        existing.find((row) => row.slug === article.slug) ??
        existing.find((row) => row.id === idByOldSlug.get(article.slug));
      if (current) {
        const localeRows = await tx.select().from(articleLocales).where(eq(articleLocales.articleId, current.id));
        for (const locale of locales) {
          const filename = article.locales[locale].markdown;
          if (!(filename in content.markdown)) continue;
          if (!localeRows.some((row) => row.locale === locale)) continue;
          await tx
            .update(articleLocales)
            .set({ body: content.markdown[filename] })
            .where(and(eq(articleLocales.articleId, current.id), eq(articleLocales.locale, locale)));
        }
        continue;
      }

      for (const tag of article.tags) await ensureTag(tag);
      const [row] = await tx.insert(articles).values({ slug: article.slug, publishedOn: article.date }).returning();
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
