import { and, desc, eq, isNull } from "drizzle-orm";
import { articles, reactions } from "./schema";
import type { TestDatabase } from "./testDb";

export const reactionTypes = ["like", "celebrate", "support", "love", "insightful", "funny"] as const;
export type ReactionType = (typeof reactionTypes)[number];

export function isReactionType(value: string): value is ReactionType {
  return (reactionTypes as readonly string[]).includes(value);
}

export async function visibleArticle(db: TestDatabase, slug: string) {
  const [article] = await db
    .select()
    .from(articles)
    .where(and(eq(articles.slug, slug), isNull(articles.deletedAt)));
  return article ?? null;
}

export async function reactionSummary(db: TestDatabase, articleId: string, userId: string | null) {
  const rows = await db
    .select()
    .from(reactions)
    .where(and(eq(reactions.articleId, articleId), isNull(reactions.deletedAt)));
  return reactionTypes.map((type) => ({
    type,
    count: rows.filter((row) => row.type === type).length,
    mine: userId !== null && rows.some((row) => row.type === type && row.userId === userId),
  }));
}

export async function activateReaction(db: TestDatabase, articleId: string, userId: string, type: ReactionType) {
  const [active] = await db
    .select()
    .from(reactions)
    .where(
      and(
        eq(reactions.articleId, articleId),
        eq(reactions.userId, userId),
        eq(reactions.type, type),
        isNull(reactions.deletedAt),
      ),
    );
  if (active) return active;

  const [deleted] = await db
    .select()
    .from(reactions)
    .where(and(eq(reactions.articleId, articleId), eq(reactions.userId, userId), eq(reactions.type, type)))
    .orderBy(desc(reactions.createdAt));
  if (deleted) {
    const [restored] = await db
      .update(reactions)
      .set({ deletedAt: null, createdAt: new Date() })
      .where(eq(reactions.id, deleted.id))
      .returning();
    return restored;
  }

  const [created] = await db
    .insert(reactions)
    .values({ articleId, userId, type })
    .returning();
  return created;
}

export async function clearReaction(db: TestDatabase, articleId: string, userId: string, type: ReactionType) {
  await db
    .update(reactions)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(reactions.articleId, articleId),
        eq(reactions.userId, userId),
        eq(reactions.type, type),
        isNull(reactions.deletedAt),
      ),
    );
}
