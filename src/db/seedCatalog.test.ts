// @vitest-environment node
import { eq } from "drizzle-orm";
import { articles } from "./schema";
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
