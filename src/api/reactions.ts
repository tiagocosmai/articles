import { isSessionId } from "../auth/visitor";
import { activateReaction, clearReaction, isReactionType, reactionSummary, visibleArticle } from "../db/reactions";
import type { TestDatabase } from "../db/testDb";
import { signInVisitor } from "../db/users";

export type ReaderSession = { id: string; role: "member" | "admin"; name: string } | null;

export async function getReactions(db: TestDatabase, slug: string, session: ReaderSession) {
  const article = await visibleArticle(db, slug);
  if (!article) return { status: 404 as const, body: { message: "not found" } };
  return {
    status: 200 as const,
    body: { reactions: await reactionSummary(db, article.id, session?.id ?? null) },
  };
}

export async function postReaction(db: TestDatabase, slug: string, sessionId: string | null, type: string) {
  if (!isReactionType(type)) return { status: 400 as const, body: { message: "invalid type" } };
  if (!sessionId || !isSessionId(sessionId)) return { status: 401 as const, body: { message: "unauthorized" } };
  const author = await signInVisitor(db, { sessionId, name: null, email: null });
  const article = await visibleArticle(db, slug);
  if (!article) return { status: 404 as const, body: { message: "not found" } };
  const row = await activateReaction(db, article.id, author.userId, type);
  return { status: 200 as const, body: row };
}

export async function deleteReaction(db: TestDatabase, slug: string, sessionId: string | null, type: string) {
  if (!sessionId || !isSessionId(sessionId)) return { status: 401 as const, body: { message: "unauthorized" } };
  if (!isReactionType(type)) return { status: 400 as const, body: { message: "invalid type" } };
  const author = await signInVisitor(db, { sessionId, name: null, email: null });
  const article = await visibleArticle(db, slug);
  if (!article) return { status: 404 as const, body: { message: "not found" } };
  await clearReaction(db, article.id, author.userId, type);
  return { status: 200 as const, body: {} };
}
