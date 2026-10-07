// @vitest-environment node
import { eq } from "drizzle-orm";
import { articleLocales, articleSlugRedirects, articles } from "../db/schema";
import { createTestDb } from "../db/testDb";
import { getArticleBySlug } from "./articles";
import { createAdminPost, listAdminPosts, setAdminPostVisibility, updateAdminPost } from "./adminPosts";

const admin = { id: "00000000-0000-4000-8000-000000000001", role: "admin" as const, name: "Tiago" };
const member = { id: "00000000-0000-4000-8000-000000000002", role: "member" as const, name: "Ada" };
const input = {
  slug: " Nota-Nova ",
  publishedOn: "2026-10-07",
  title: { pt: " PT ", en: "EN", es: "ES" },
  description: { pt: "d", en: "d", es: "d" },
};

it("creates an empty post, edits it, and redirects both former slugs", async () => {
  const db = await createTestDb();
  expect((await listAdminPosts(db, null)).status).toBe(401);
  expect((await createAdminPost(db, null, input)).status).toBe(401);
  expect((await listAdminPosts(db, member)).status).toBe(403);
  expect((await createAdminPost(db, admin, { ...input, slug: "Nota Nova" })).body).toEqual({ message: "invalid slug" });
  expect((await createAdminPost(db, admin, { ...input, slug: "ok", publishedOn: "2026-02-31" })).body).toEqual({
    message: "invalid date",
  });
  expect((await createAdminPost(db, admin, { ...input, title: { pt: " ", en: "EN", es: "ES" } })).body).toEqual({
    message: "invalid title",
  });
  expect((await createAdminPost(db, admin, { ...input, description: { pt: "d", en: " ", es: "d" } })).body).toEqual({
    message: "invalid description",
  });

  const created = await createAdminPost(db, admin, input);
  expect(created.status).toBe(200);
  if (created.status !== 200) throw new Error("expected create");
  expect(created.body.post).toMatchObject({
    slug: "nota-nova",
    publishedOn: "2026-10-07",
    title: { pt: "PT", en: "EN", es: "ES" },
    state: "empty",
  });
  const locales = await db.select().from(articleLocales).where(eq(articleLocales.articleId, created.body.post.id));
  expect(locales.map((row) => row.body)).toEqual(["", "", ""]);

  await db.update(articleLocales).set({ body: "corpo" }).where(eq(articleLocales.articleId, created.body.post.id));
  const renamed = await updateAdminPost(db, admin, created.body.post.id, {
    ...input,
    slug: "nota-final",
    title: { pt: "Final", en: "EN", es: "ES" },
  });
  expect(renamed.status).toBe(200);
  if (renamed.status !== 200) throw new Error("expected rename");
  expect(renamed.body.post.slug).toBe("nota-final");
  expect(renamed.body.post.state).toBe("live");
  const afterRename = await db.select().from(articleLocales).where(eq(articleLocales.articleId, created.body.post.id));
  expect(afterRename.every((row) => row.body === "corpo")).toBe(true);

  const again = await updateAdminPost(db, admin, created.body.post.id, { ...input, slug: "nota-ultima" });
  expect(again.status).toBe(200);
  expect(await getArticleBySlug(db, "nota-nova")).toEqual({ status: 301, body: { slug: "nota-ultima" } });
  expect(await getArticleBySlug(db, "nota-final")).toEqual({ status: 301, body: { slug: "nota-ultima" } });

  const reclaimed = await updateAdminPost(db, admin, created.body.post.id, { ...input, slug: "nota-nova" });
  expect(reclaimed.status).toBe(200);
  if (reclaimed.status !== 200) throw new Error("expected reclaim");
  const redirects = await db.select().from(articleSlugRedirects);
  expect(redirects.map((row) => row.slug).sort()).toEqual(["nota-final", "nota-ultima"]);
  expect(await getArticleBySlug(db, "nota-nova")).toMatchObject({ status: 200 });

  const [other] = await db.insert(articles).values({ slug: "ocupado", publishedOn: "2026-10-01" }).returning();
  await db.insert(articleSlugRedirects).values({ slug: "alheio", articleId: other.id });
  expect((await updateAdminPost(db, admin, created.body.post.id, { ...input, slug: "ocupado" })).body).toEqual({
    message: "slug taken",
  });
  expect((await updateAdminPost(db, admin, created.body.post.id, { ...input, slug: "alheio" })).body).toEqual({
    message: "slug taken",
  });
  expect((await updateAdminPost(db, admin, "00000000-0000-4000-8000-000000000099", input)).status).toBe(404);

  const hidden = await setAdminPostVisibility(db, admin, created.body.post.id, false);
  expect(hidden.status).toBe(200);
  if (hidden.status !== 200) throw new Error("expected hide");
  expect(hidden.body.post.state).toBe("hidden");
  const [row] = await db.select().from(articles).where(eq(articles.id, created.body.post.id));
  const repeated = await setAdminPostVisibility(db, admin, created.body.post.id, false);
  expect(repeated.status).toBe(200);
  const [still] = await db.select().from(articles).where(eq(articles.id, created.body.post.id));
  expect(still.updatedAt).toEqual(row.updatedAt);

  const shown = await setAdminPostVisibility(db, admin, created.body.post.id, true);
  expect(shown.status).toBe(200);
  if (shown.status !== 200) throw new Error("expected show");
  expect(shown.body.post.state).toBe("live");
  expect((await setAdminPostVisibility(db, admin, created.body.post.id, "yes")).body).toEqual({
    message: "invalid visibility",
  });

  const listed = await listAdminPosts(db, admin);
  expect(listed.status).toBe(200);
  if (listed.status !== 200) throw new Error("expected list");
  expect(listed.body.posts.map((post) => post.slug)).toEqual(["nota-nova", "ocupado"]);
});
