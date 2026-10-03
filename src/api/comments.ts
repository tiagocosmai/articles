import { and, asc, eq, isNull, or } from "drizzle-orm";
import { visibleArticle } from "../db/reactions";
import { comments, users } from "../db/schema";
import type { TestDatabase } from "../db/testDb";
import type { ReaderSession } from "./reactions";

const maxBodyLength = 1000;

export function commentsAutoApprove(): boolean {
  return process.env.COMMENTS_AUTO_APPROVE !== "false";
}

function present(
  row: {
    id: string;
    body: string;
    status: "pending" | "approved" | "rejected";
    parentId: string | null;
    userId: string;
    createdAt: Date;
    userName: string;
  },
  session: ReaderSession,
) {
  return {
    id: row.id,
    body: row.body,
    status: row.status,
    parentId: row.parentId,
    userName: row.userName,
    createdAt: row.createdAt,
    mine: session?.id === row.userId,
  };
}

export async function postComment(
  db: TestDatabase,
  slug: string,
  session: ReaderSession,
  input: { body: string; parentId: string | null },
) {
  if (!session) return { status: 401 as const, body: { message: "unauthorized" } };
  const body = input.body.trim();
  if (body.length === 0 || body.length > maxBodyLength) {
    return { status: 400 as const, body: { message: "invalid body" } };
  }
  const article = await visibleArticle(db, slug);
  if (!article) return { status: 404 as const, body: { message: "not found" } };
  if (input.parentId) {
    const [parent] = await db
      .select()
      .from(comments)
      .where(and(eq(comments.id, input.parentId), eq(comments.articleId, article.id), isNull(comments.deletedAt)));
    if (!parent || parent.parentId) return { status: 400 as const, body: { message: "invalid parent" } };
  }
  const [created] = await db
    .insert(comments)
    .values({
      articleId: article.id,
      userId: session.id,
      parentId: input.parentId,
      body,
      status: commentsAutoApprove() ? "approved" : "pending",
    })
    .returning();
  return {
    status: 201 as const,
    body: present({ ...created, userName: session.name }, session),
  };
}

export async function getComments(db: TestDatabase, slug: string, session: ReaderSession) {
  const article = await visibleArticle(db, slug);
  if (!article) return { status: 404 as const, body: { message: "not found" } };
  const visibility = session
    ? or(eq(comments.status, "approved"), eq(comments.userId, session.id))
    : eq(comments.status, "approved");
  const rows = await db
    .select({
      id: comments.id,
      body: comments.body,
      status: comments.status,
      parentId: comments.parentId,
      userId: comments.userId,
      createdAt: comments.createdAt,
      userName: users.name,
    })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.userId))
    .where(and(eq(comments.articleId, article.id), isNull(comments.deletedAt), visibility))
    .orderBy(asc(comments.createdAt));
  return { status: 200 as const, body: { comments: rows.map((row) => present(row, session)) } };
}

export async function deleteComment(db: TestDatabase, slug: string, session: ReaderSession, id: string) {
  if (!session) return { status: 401 as const, body: { message: "unauthorized" } };
  const article = await visibleArticle(db, slug);
  if (!article) return { status: 404 as const, body: { message: "not found" } };
  const [comment] = await db
    .select()
    .from(comments)
    .where(and(eq(comments.id, id), eq(comments.articleId, article.id), isNull(comments.deletedAt)));
  if (!comment) return { status: 404 as const, body: { message: "not found" } };
  if (comment.userId !== session.id && session.role !== "admin") {
    return { status: 403 as const, body: { message: "forbidden" } };
  }
  await db.update(comments).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(comments.id, id));
  return { status: 200 as const, body: {} };
}
