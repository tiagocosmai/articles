// @vitest-environment node
import { eq } from "drizzle-orm";
import { articleLocales, articleSlugRedirects, articles } from "../db/schema";
import { seedCatalog } from "../db/seedCatalog";
import { createTestDb } from "../db/testDb";
import type { LoadedContent } from "../types/content";
import { getArticleBySlug, getArticleList } from "./articles";

const content: LoadedContent = {
  errors: [],
  articles: [{
    slug: "o-agente-secreto",
    date: "2026-09-24",
    tags: [{ id: "AI", pt: "IA", en: "AI", es: "IA" }],
    locales: {
      pt: { title: "PT", description: "d", markdown: "o-agente-secreto.pt.md" },
      en: { title: "EN", description: "d", markdown: "o-agente-secreto.en.md" },
      es: { title: "ES", description: "d", markdown: "o-agente-secreto.es.md" },
    },
  }],
  markdown: {
    "o-agente-secreto.pt.md": "corpo",
    "o-agente-secreto.en.md": "body",
    "o-agente-secreto.es.md": "cuerpo",
  },
  flashcards: {},
  redirects: [],
};

it("returns 404 for a missing or deleted slug and 200 for a visible one", async () => {
  const db = await createTestDb();
  const list = await getArticleList(db);
  expect(list).toEqual({
    status: 200,
    body: { articles: [], errors: [], markdown: {}, flashcards: {}, redirects: [] },
  });
  expect(await getArticleBySlug(db, "ausente")).toEqual({
    status: 404,
    body: { message: "not found" },
  });

  await seedCatalog(db, content);
  const seeded = await getArticleList(db);
  expect(seeded.status).toBe(200);
  expect(seeded.body.articles.map((article) => article.slug)).toEqual(["o-agente-secreto"]);
  const found = await getArticleBySlug(db, "o-agente-secreto");
  expect(found.status).toBe(200);
  expect(found.body).toMatchObject({ markdown: { "o-agente-secreto.pt.md": "corpo" } });

  await db.update(articles).set({ deletedAt: new Date() }).where(eq(articles.slug, "o-agente-secreto"));
  const afterDelete = await getArticleList(db);
  expect(afterDelete.body.articles).toHaveLength(0);
  expect(await getArticleBySlug(db, "o-agente-secreto")).toEqual({
    status: 404,
    body: { message: "not found" },
  });
});

it("redirects a former slug only while the post is live", async () => {
  const db = await createTestDb();
  const [article] = await db.insert(articles).values({ slug: "nota-nova", publishedOn: "2026-10-07" }).returning();
  await db.insert(articleLocales).values([
    { articleId: article.id, locale: "pt", title: "PT", description: "d", body: "corpo" },
    { articleId: article.id, locale: "en", title: "EN", description: "d", body: "body" },
    { articleId: article.id, locale: "es", title: "ES", description: "d", body: "cuerpo" },
  ]);
  await db.insert(articleSlugRedirects).values({ slug: "nota", articleId: article.id });

  expect(await getArticleBySlug(db, "nota")).toEqual({ status: 301, body: { slug: "nota-nova" } });
  expect((await getArticleBySlug(db, "nota-nova")).status).toBe(200);

  await db.update(articleLocales).set({ body: "   " }).where(eq(articleLocales.articleId, article.id));
  expect(await getArticleBySlug(db, "nota")).toEqual({ status: 404, body: { message: "not found" } });

  await db.update(articleLocales).set({ body: "corpo" }).where(eq(articleLocales.articleId, article.id));
  await db.update(articles).set({ deletedAt: new Date() }).where(eq(articles.id, article.id));
  expect(await getArticleBySlug(db, "nota")).toEqual({ status: 404, body: { message: "not found" } });
  expect(await getArticleBySlug(db, "ausente")).toEqual({ status: 404, body: { message: "not found" } });
});
