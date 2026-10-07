// @vitest-environment node
import { eq } from "drizzle-orm";
import { articleSlugRedirects, articles, reactions, users } from "./schema";
import { createTestDb } from "./testDb";

it("allows one active reaction of each type and a new row after soft delete", async () => {
  const db = await createTestDb();
  const [user] = await db.insert(users).values({ name: "Ada" }).returning();
  const [article] = await db
    .insert(articles)
    .values({ slug: "o-agente-secreto", publishedOn: "2026-09-24" })
    .returning();
  await db.insert(reactions).values({
    articleId: article.id,
    userId: user.id,
    type: "like",
  });
  await expect(
    db.insert(reactions).values({
      articleId: article.id,
      userId: user.id,
      type: "like",
    }),
  ).rejects.toThrow();
  await db
    .update(reactions)
    .set({ deletedAt: new Date() })
    .where(eq(reactions.userId, user.id));
  await db.insert(reactions).values({
    articleId: article.id,
    userId: user.id,
    type: "like",
  });
  await db.insert(reactions).values({
    articleId: article.id,
    userId: user.id,
    type: "love",
  });
});

it("rejects two redirects with the same former slug", async () => {
  const db = await createTestDb();
  const [first] = await db.insert(articles).values({ slug: "nota", publishedOn: "2026-10-01" }).returning();
  const [second] = await db.insert(articles).values({ slug: "outra", publishedOn: "2026-10-02" }).returning();
  await db.insert(articleSlugRedirects).values({ slug: "antiga", articleId: first.id });
  await expect(
    db.insert(articleSlugRedirects).values({ slug: "antiga", articleId: second.id }),
  ).rejects.toThrow();
});
