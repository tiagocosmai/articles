import { and, desc, eq, isNull } from "drizzle-orm";
import { articleLocales, articles, comments, users } from "../db/schema";
import type { TestDatabase } from "../db/testDb";
import type { ReaderSession } from "./reactions";

const commentStatuses = ["pending", "approved", "rejected"] as const;
type CommentStatus = (typeof commentStatuses)[number];

export type AdminComment = {
  id: string;
  articleSlug: string;
  articleTitle: string;
  authorName: string;
  createdAt: Date;
  status: CommentStatus;
  body: string;
  parentId: string | null;
};

export type CommentFilter = { status?: string; article?: string };

function gate(session: ReaderSession) {
  if (!session) return { status: 401 as const, body: { message: "unauthorized" as const } };
  if (session.role !== "admin") return { status: 403 as const, body: { message: "forbidden" as const } };
  return null;
}

function isStatus(value: string): value is CommentStatus {
  return commentStatuses.includes(value as CommentStatus);
}

function titleFor(slug: string, locales: { locale: string; title: string }[]) {
  const byLocale = new Map(locales.map((locale) => [locale.locale, locale.title.trim()]));
  return byLocale.get("pt") || byLocale.get("en") || byLocale.get("es") || slug;
}

function present(row: {
  id: string;
  body: string;
  status: CommentStatus;
  parentId: string | null;
  createdAt: Date;
  articleSlug: string;
  authorName: string;
  locales: { locale: string; title: string }[];
}): AdminComment {
  return {
    id: row.id,
    articleSlug: row.articleSlug,
    articleTitle: titleFor(row.articleSlug, row.locales),
    authorName: row.authorName,
    createdAt: row.createdAt,
    status: row.status,
    body: row.body,
    parentId: row.parentId,
  };
}

export async function listAdminComments(db: TestDatabase, session: ReaderSession, filter: CommentFilter = {}) {
  const denied = gate(session);
  if (denied) return denied;
  const status = filter.status?.trim() ?? "";
  if (status && !isStatus(status)) return { status: 400 as const, body: { message: "invalid status" as const } };
  const article = filter.article?.trim() ?? "";
  const rows = await db
    .select({
      id: comments.id,
      body: comments.body,
      status: comments.status,
      parentId: comments.parentId,
      createdAt: comments.createdAt,
      articleId: articles.id,
      articleSlug: articles.slug,
      authorName: users.name,
    })
    .from(comments)
    .innerJoin(articles, eq(articles.id, comments.articleId))
    .innerJoin(users, eq(users.id, comments.userId))
    .where(and(isNull(comments.deletedAt), ...(status ? [eq(comments.status, status as CommentStatus)] : []), ...(article ? [eq(articles.slug, article)] : [])))
    .orderBy(desc(comments.createdAt), desc(comments.id));
  const localeRows = await db
    .select({
      articleId: articleLocales.articleId,
      locale: articleLocales.locale,
      title: articleLocales.title,
    })
    .from(articleLocales);
  return {
    status: 200 as const,
    body: {
      comments: rows.map((row) => present({ ...row, locales: localeRows.filter((locale) => locale.articleId === row.articleId) })),
    },
  };
}

async function visibleComment(db: TestDatabase, id: string) {
  const [row] = await db
    .select({
      id: comments.id,
      body: comments.body,
      status: comments.status,
      parentId: comments.parentId,
      createdAt: comments.createdAt,
      articleId: articles.id,
      articleSlug: articles.slug,
      authorName: users.name,
    })
    .from(comments)
    .innerJoin(articles, eq(articles.id, comments.articleId))
    .innerJoin(users, eq(users.id, comments.userId))
    .where(and(eq(comments.id, id), isNull(comments.deletedAt)));
  return row ?? null;
}

export async function setCommentStatus(db: TestDatabase, session: ReaderSession, id: string, status: string) {
  const denied = gate(session);
  if (denied) return denied;
  if (!isStatus(status)) return { status: 400 as const, body: { message: "invalid status" as const } };
  const current = await visibleComment(db, id);
  if (!current) return { status: 404 as const, body: { message: "not found" as const } };
  await db.update(comments).set({ status, updatedAt: new Date() }).where(eq(comments.id, id));
  const localeRows = await db
    .select({
      articleId: articleLocales.articleId,
      locale: articleLocales.locale,
      title: articleLocales.title,
    })
    .from(articleLocales)
    .where(eq(articleLocales.articleId, current.articleId));
  return { status: 200 as const, body: { comment: present({ ...current, status, locales: localeRows }) } };
}

export async function deleteAdminComment(db: TestDatabase, session: ReaderSession, id: string) {
  const denied = gate(session);
  if (denied) return denied;
  const current = await visibleComment(db, id);
  if (!current) return { status: 404 as const, body: { message: "not found" as const } };
  await db.update(comments).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(comments.id, id));
  return { status: 200 as const, body: {} };
}
