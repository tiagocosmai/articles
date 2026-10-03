import { and, asc, eq, isNull } from "drizzle-orm";
import { comments, users } from "../db/schema";
import type { TestDatabase } from "../db/testDb";
import type { ReaderSession } from "./reactions";

function gate(session: ReaderSession) {
  if (!session) return { status: 401 as const, body: { message: "unauthorized" } };
  if (session.role !== "admin") return { status: 403 as const, body: { message: "forbidden" } };
  return null;
}

export async function listAdminComments(db: TestDatabase, session: ReaderSession) {
  const denied = gate(session);
  if (denied) return denied;
  const rows = await db
    .select({
      id: comments.id,
      body: comments.body,
      status: comments.status,
      parentId: comments.parentId,
      userName: users.name,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.userId))
    .where(isNull(comments.deletedAt))
    .orderBy(asc(comments.createdAt));
  return { status: 200 as const, body: { comments: rows } };
}

async function setStatus(db: TestDatabase, session: ReaderSession, id: string, status: "approved" | "rejected") {
  const denied = gate(session);
  if (denied) return denied;
  await db.update(comments).set({ status, updatedAt: new Date() }).where(and(eq(comments.id, id), isNull(comments.deletedAt)));
  return { status: 200 as const, body: {} };
}

export function approveComment(db: TestDatabase, session: ReaderSession, id: string) {
  return setStatus(db, session, id, "approved");
}

export function rejectComment(db: TestDatabase, session: ReaderSession, id: string) {
  return setStatus(db, session, id, "rejected");
}
