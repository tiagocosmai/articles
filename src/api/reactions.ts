import { activateReaction, clearReaction, isReactionType, reactionSummary, visibleArticle } from "../db/reactions";
import type { TestDatabase } from "../db/testDb";

export type ReaderSession = { id: string; role: "member" | "admin"; name: string } | null;

export async function getReactions(db: TestDatabase, slug: string, session: ReaderSession) {
  const article = await visibleArticle(db, slug);
  if (!article) return { status: 404 as const, body: { message: "not found" } };
  return {
    status: 200 as const,
    body: { reactions: await reactionSummary(db, article.id, session?.id ?? null) },
  };
}

export async function postReaction(db: TestDatabase, slug: string, session: ReaderSession, type: string) {
  if (!isReactionType(type)) return { status: 400 as const, body: { message: "invalid type" } };
  if (!session) return { status: 401 as const, body: { message: "unauthorized" } };
  const article = await visibleArticle(db, slug);
  if (!article) return { status: 404 as const, body: { message: "not found" } };
  const row = await activateReaction(db, article.id, session.id, type);
  return { status: 200 as const, body: row };
}

export async function deleteReaction(db: TestDatabase, slug: string, session: ReaderSession, type: string) {
  if (!session) return { status: 401 as const, body: { message: "unauthorized" } };
  if (!isReactionType(type)) return { status: 400 as const, body: { message: "invalid type" } };
  const article = await visibleArticle(db, slug);
  if (!article) return { status: 404 as const, body: { message: "not found" } };
  await clearReaction(db, article.id, session.id, type);
  return { status: 200 as const, body: {} };
}
