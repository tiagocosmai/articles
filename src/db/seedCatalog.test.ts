// @vitest-environment node
import { eq } from "drizzle-orm";
import { articleLocales, articleSlugRedirects, articles } from "./schema";
import { createTestDb } from "./testDb";
import { readPublishedCatalog } from "./catalog";
import { seedCatalog } from "./seedCatalog";
import type { LoadedContent } from "../types/content";

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
  flashcards: {
    "o-agente-secreto.pt.json": [{ id: "card", front: "frente", back: "verso" }],
  },
  linkedinPosts: {},
  redirects: [],
};

it("updates an existing slug and keeps deleted_at", async () => {
  const db = await createTestDb();
  await seedCatalog(db, content);
  await seedCatalog(db, content);
  const rows = await db.select().from(articles).where(eq(articles.slug, "o-agente-secreto"));
  expect(rows).toHaveLength(1);
  await db.update(articles).set({ deletedAt: new Date("2026-10-02T00:00:00Z") }).where(eq(articles.slug, "o-agente-secreto"));
  await seedCatalog(db, content);
  const [row] = await db.select().from(articles).where(eq(articles.slug, "o-agente-secreto"));
  expect(row.deletedAt).not.toBeNull();
  expect(await readPublishedCatalog(db)).toMatchObject({ articles: [] });
});

it("copies a new body and keeps the admin title, date, and slug", async () => {
  const db = await createTestDb();
  await seedCatalog(db, content);
  const [article] = await db.select().from(articles).where(eq(articles.slug, "o-agente-secreto"));
  await db.update(articles).set({ publishedOn: "2026-01-02" }).where(eq(articles.id, article.id));
  await db.update(articleLocales).set({ title: "Editado" }).where(eq(articleLocales.articleId, article.id));
  await seedCatalog(db, {
    ...content,
    markdown: { ...content.markdown, "o-agente-secreto.pt.md": "corpo novo" },
  });
  const [kept] = await db.select().from(articles).where(eq(articles.id, article.id));
  const locales = await db.select().from(articleLocales).where(eq(articleLocales.articleId, article.id));
  expect(kept.publishedOn).toBe("2026-01-02");
  expect(kept.slug).toBe("o-agente-secreto");
  expect(locales.find((row) => row.locale === "pt")).toMatchObject({ title: "Editado", body: "corpo novo" });
});

it("updates the body through a former slug and leaves a database-only post", async () => {
  const db = await createTestDb();
  await seedCatalog(db, content);
  const [article] = await db.select().from(articles).where(eq(articles.slug, "o-agente-secreto"));
  await db.update(articles).set({ slug: "agente" }).where(eq(articles.id, article.id));
  await db.insert(articleSlugRedirects).values({ slug: "o-agente-secreto", articleId: article.id });
  const [onlyDb] = await db.insert(articles).values({ slug: "so-banco", publishedOn: "2026-10-03" }).returning();
  await seedCatalog(db, {
    ...content,
    markdown: { ...content.markdown, "o-agente-secreto.en.md": "body novo" },
  });
  const rows = await db.select().from(articles);
  expect(rows.map((row) => row.slug).sort()).toEqual(["agente", "so-banco"]);
  const locales = await db.select().from(articleLocales).where(eq(articleLocales.articleId, article.id));
  expect(locales.find((row) => row.locale === "en")?.body).toBe("body novo");
  expect(onlyDb.slug).toBe("so-banco");
});

it("keeps a body when the file has no markdown for that language", async () => {
  const db = await createTestDb();
  await seedCatalog(db, content);
  const { "o-agente-secreto.en.md": _english, ...markdown } = content.markdown;
  await seedCatalog(db, { ...content, markdown });
  const [article] = await db.select().from(articles).where(eq(articles.slug, "o-agente-secreto"));
  const locales = await db.select().from(articleLocales).where(eq(articleLocales.articleId, article.id));
  expect(locales.find((row) => row.locale === "en")?.body).toBe("body");
});
