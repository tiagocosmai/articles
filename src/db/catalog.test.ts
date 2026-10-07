// @vitest-environment node
import { articleSlugRedirects, articles, articleLocales, articleTags, flashcards, tagLocales, tags } from "./schema";
import { createTestDb } from "./testDb";
import { readPublishedCatalog } from "./catalog";

it("hides a deleted article and rebuilds the catalog shape", async () => {
  const db = await createTestDb();
  const [visible] = await db.insert(articles).values({ slug: "visivel", publishedOn: "2026-09-26" }).returning();
  const [hidden] = await db.insert(articles).values({
    slug: "oculto",
    publishedOn: "2026-09-01",
    deletedAt: new Date(),
  }).returning();
  const [tag] = await db.insert(tags).values({ code: "AI" }).returning();
  await db.insert(tagLocales).values([
    { tagId: tag.id, locale: "pt", label: "IA" },
    { tagId: tag.id, locale: "en", label: "AI" },
    { tagId: tag.id, locale: "es", label: "IA" },
  ]);
  for (const article of [visible, hidden]) {
    await db.insert(articleLocales).values([
      { articleId: article.id, locale: "pt", title: "PT", description: "d", body: "corpo" },
      { articleId: article.id, locale: "en", title: "EN", description: "d", body: "body" },
      { articleId: article.id, locale: "es", title: "ES", description: "d", body: "cuerpo" },
    ]);
    await db.insert(articleTags).values({ articleId: article.id, tagId: tag.id, position: 0 });
    await db.insert(flashcards).values({
      articleId: article.id,
      locale: "pt",
      code: "card",
      front: "frente",
      back: "verso",
      position: 0,
    });
  }
  const content = await readPublishedCatalog(db);
  expect(content.errors).toEqual([]);
  expect(content.articles.map((article) => article.slug)).toEqual(["visivel"]);
  expect(content.articles[0].tags).toEqual([{ id: "AI", pt: "IA", en: "AI", es: "IA" }]);
  expect(content.markdown["visivel.pt.md"]).toBe("corpo");
  expect(content.flashcards["visivel.pt.json"]).toEqual([{ id: "card", front: "frente", back: "verso" }]);
  expect(content.redirects).toEqual([]);
});

it("hides an empty body and lists redirects only for a live post", async () => {
  const db = await createTestDb();
  const [live] = await db.insert(articles).values({ slug: "nota-nova", publishedOn: "2026-10-07" }).returning();
  const [future] = await db.insert(articles).values({ slug: "futuro", publishedOn: "2026-12-01" }).returning();
  const [blank] = await db.insert(articles).values({ slug: "vazio", publishedOn: "2026-11-01" }).returning();
  await db.insert(articleLocales).values([
    { articleId: live.id, locale: "pt", title: "PT", description: "d", body: "corpo" },
    { articleId: live.id, locale: "en", title: "EN", description: "d", body: "body" },
    { articleId: live.id, locale: "es", title: "ES", description: "d", body: "cuerpo" },
    { articleId: future.id, locale: "pt", title: "PT", description: "d", body: "corpo" },
    { articleId: future.id, locale: "en", title: "EN", description: "d", body: "body" },
    { articleId: future.id, locale: "es", title: "ES", description: "d", body: "cuerpo" },
    { articleId: blank.id, locale: "pt", title: "PT", description: "d", body: "   " },
    { articleId: blank.id, locale: "en", title: "EN", description: "d", body: "body" },
    { articleId: blank.id, locale: "es", title: "ES", description: "d", body: "cuerpo" },
  ]);
  await db.insert(articleSlugRedirects).values([
    { slug: "nota", articleId: live.id },
    { slug: "antes", articleId: blank.id },
  ]);

  const content = await readPublishedCatalog(db);
  expect(content.articles.map((article) => article.slug)).toEqual(["futuro", "nota-nova"]);
  expect(content.redirects).toEqual([{ from: "nota", to: "nota-nova" }]);
});
