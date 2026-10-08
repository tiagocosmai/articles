// @vitest-environment node
import { eq } from "drizzle-orm";
import { articles, articleLocales } from "../db/schema";
import { createTestDb } from "../db/testDb";
import { getAdminArticlePreview } from "./adminArticlePreview";
import { getArticleBySlug } from "./articles";

const admin = { id: "admin-id", role: "admin" as const, name: "Admin" };
const member = { id: "member-id", role: "member" as const, name: "Member" };

it("shows a hidden scheduled post to the admin and hides it from the public", async () => {
  const db = await createTestDb();
  const [row] = await db
    .insert(articles)
    .values({ slug: "rascunho", publishedOn: "2099-01-01", deletedAt: new Date() })
    .returning();
  await db.insert(articleLocales).values([
    { articleId: row.id, locale: "pt", title: "PT", description: "d", objective: "o", body: "corpo" },
    { articleId: row.id, locale: "en", title: "EN", description: "d", objective: "o", body: "body" },
    { articleId: row.id, locale: "es", title: "ES", description: "d", objective: "o", body: "cuerpo" },
  ]);

  expect((await getAdminArticlePreview(db, null, "rascunho")).status).toBe(401);
  expect((await getAdminArticlePreview(db, member, "rascunho")).status).toBe(403);

  const preview = await getAdminArticlePreview(db, admin, "rascunho");
  expect(preview.status).toBe(200);
  if (preview.status !== 200) return;
  expect(preview.body.state).toBe("hidden");
  expect(preview.body.markdown["rascunho.pt.md"]).toBe("corpo");

  expect(await getArticleBySlug(db, "rascunho")).toMatchObject({ status: 404 });
});

it("returns not found for an unknown slug", async () => {
  const db = await createTestDb();
  expect(await getAdminArticlePreview(db, admin, "ausente")).toMatchObject({ status: 404 });
});
