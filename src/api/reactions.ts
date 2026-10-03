import { guestContact } from "../auth/guest";
import { activateReaction, clearReaction, isReactionType, reactionSummary, visibleArticle } from "../db/reactions";
import type { TestDatabase } from "../db/testDb";
import { signInGuest } from "../db/users";

export type ReaderSession = { id: string; role: "member" | "admin"; name: string } | null;

export async function getReactions(db: TestDatabase, slug: string, session: ReaderSession) {
  const article = await visibleArticle(db, slug);
  if (!article) return { status: 404 as const, body: { message: "not found" } };
  return {
    status: 200 as const,
    body: { reactions: await reactionSummary(db, article.id, session?.id ?? null) },
  };
}

async function readerOrGuest(
  db: TestDatabase,
  session: ReaderSession,
  name?: string,
  email?: string,
) {
  if (session) return { status: 200 as const, reader: session };
  const contact = guestContact(name, email);
  if ((name || email) && !contact) return { status: 400 as const, reader: null };
  if (!contact) return { status: 401 as const, reader: null };
  const guest = await signInGuest(db, contact);
  return { status: 200 as const, reader: { id: guest.userId, role: guest.role, name: guest.name } };
}

export async function postReaction(
  db: TestDatabase,
  slug: string,
  session: ReaderSession,
  type: string,
  contact?: { name?: string; email?: string },
) {
  if (!isReactionType(type)) return { status: 400 as const, body: { message: "invalid type" } };
  const author = await readerOrGuest(db, session, contact?.name, contact?.email);
  if (!author.reader) return { status: author.status, body: { message: author.status === 400 ? "invalid contact" : "unauthorized" } };
  const article = await visibleArticle(db, slug);
  if (!article) return { status: 404 as const, body: { message: "not found" } };
  const row = await activateReaction(db, article.id, author.reader.id, type);
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
