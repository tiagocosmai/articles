// @vitest-environment node
import { eq } from "drizzle-orm";
import { articleLocales, articles, comments, reactions } from "../db/schema";
import { seedCatalog } from "../db/seedCatalog";
import { createTestDb } from "../db/testDb";
import { signInIdentity } from "../db/users";
import type { LoadedContent } from "../types/content";
import { getAdminReport } from "./adminReport";

const content: LoadedContent = {
  errors: [],
  articles: [
    {
      slug: "antigo",
      date: "2026-09-01",
      tags: [],
      locales: {
        pt: { title: "Antigo", description: "d", markdown: "antigo.pt.md" },
        en: { title: "Old", description: "d", markdown: "antigo.en.md" },
        es: { title: "Viejo", description: "d", markdown: "antigo.es.md" },
      },
    },
    {
      slug: "novo",
      date: "2026-10-01",
      tags: [],
      locales: {
        pt: { title: "", description: "d", markdown: "novo.pt.md" },
        en: { title: "New", description: "d", markdown: "novo.en.md" },
        es: { title: "Nuevo", description: "d", markdown: "novo.es.md" },
      },
    },
  ],
  markdown: {},
  flashcards: {},
  linkedinPosts: {},
  redirects: [],
};

it("counts visible comments and reactions for an admin", async () => {
  const db = await createTestDb();
  await seedCatalog(db, content);
  const member = await signInIdentity(db, {
    provider: "linkedin",
    providerAccountId: "ln-1",
    providerUsername: null,
    name: "Ada",
    email: null,
    currentUserId: null,
  });
  const admin = await signInIdentity(db, {
    provider: "github",
    providerAccountId: "1",
    providerUsername: "tiagocosmai",
    name: "Tiago",
    email: null,
    currentUserId: null,
  });
  const [oldArticle] = await db.select().from(articles).where(eq(articles.slug, "antigo"));
  const [newArticle] = await db.select().from(articles).where(eq(articles.slug, "novo"));
  await db.insert(comments).values([
    { articleId: oldArticle.id, userId: member.userId, body: "p", status: "pending" },
    { articleId: oldArticle.id, userId: member.userId, body: "a", status: "approved" },
    { articleId: oldArticle.id, userId: member.userId, body: "r", status: "rejected" },
    { articleId: oldArticle.id, userId: member.userId, body: "x", status: "approved", deletedAt: new Date() },
  ]);
  await db.insert(reactions).values([
    { articleId: oldArticle.id, userId: member.userId, type: "like" },
    { articleId: oldArticle.id, userId: admin.userId, type: "love" },
    { articleId: oldArticle.id, userId: admin.userId, type: "funny", deletedAt: new Date() },
  ]);
  await db.delete(articleLocales).where(eq(articleLocales.articleId, newArticle.id));
  await db.insert(articleLocales).values({
    articleId: newArticle.id,
    locale: "es",
    title: "Nuevo",
    description: "d",
    body: "",
  });

  expect((await getAdminReport(db, null)).status).toBe(401);
  expect((await getAdminReport(db, { id: member.userId, role: "member", name: "Ada" })).status).toBe(403);

  const report = await getAdminReport(db, { id: admin.userId, role: "admin", name: "Tiago" });
  expect(report.status).toBe(200);
  if (report.status !== 200) throw new Error("expected report");
  expect(report.body.articles.map((article) => article.slug)).toEqual(["novo", "antigo"]);
  expect(report.body.articles[0]).toMatchObject({
    title: "Nuevo",
    comments: { pending: 0, approved: 0, rejected: 0 },
    reactions: { like: 0, celebrate: 0, support: 0, love: 0, insightful: 0, funny: 0 },
  });
  expect(report.body.articles[1]).toMatchObject({
    title: "Antigo",
    comments: { pending: 1, approved: 1, rejected: 1 },
    reactions: { like: 1, celebrate: 0, support: 0, love: 1, insightful: 0, funny: 0 },
  });
});
