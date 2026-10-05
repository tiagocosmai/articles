import { isNull, sql } from "drizzle-orm";
import { articleLocales, articles, comments, reactions } from "../db/schema";
import type { TestDatabase } from "../db/testDb";
import type { ReaderSession } from "./reactions";

type ReactionType = "like" | "celebrate" | "support" | "love" | "insightful" | "funny";

export type AdminReportArticle = {
  slug: string;
  title: string;
  publishedOn: string;
  comments: { pending: number; approved: number; rejected: number };
  reactions: Record<ReactionType, number>;
};

function gate(session: ReaderSession) {
  if (!session) return { status: 401 as const, body: { message: "unauthorized" as const } };
  if (session.role !== "admin") return { status: 403 as const, body: { message: "forbidden" as const } };
  return null;
}

function titleFor(slug: string, locales: { locale: string; title: string }[]) {
  const byLocale = new Map(locales.map((locale) => [locale.locale, locale.title.trim()]));
  return byLocale.get("pt") || byLocale.get("en") || byLocale.get("es") || slug;
}

function emptyReactions(): Record<ReactionType, number> {
  return { like: 0, celebrate: 0, support: 0, love: 0, insightful: 0, funny: 0 };
}

export async function getAdminReport(db: TestDatabase, session: ReaderSession) {
  const denied = gate(session);
  if (denied) return denied;
  const articleRows = await db
    .select({ id: articles.id, slug: articles.slug, publishedOn: articles.publishedOn })
    .from(articles)
    .where(isNull(articles.deletedAt));
  const localeRows = await db
    .select({ articleId: articleLocales.articleId, locale: articleLocales.locale, title: articleLocales.title })
    .from(articleLocales);
  const commentRows = await db
    .select({
      articleId: comments.articleId,
      status: comments.status,
      count: sql<number>`count(*)::int`,
    })
    .from(comments)
    .where(isNull(comments.deletedAt))
    .groupBy(comments.articleId, comments.status);
  const reactionRows = await db
    .select({
      articleId: reactions.articleId,
      type: reactions.type,
      count: sql<number>`count(*)::int`,
    })
    .from(reactions)
    .where(isNull(reactions.deletedAt))
    .groupBy(reactions.articleId, reactions.type);

  const articlesOut: AdminReportArticle[] = articleRows.map((article) => {
    const commentsCount = { pending: 0, approved: 0, rejected: 0 };
    for (const row of commentRows) {
      if (row.articleId !== article.id) continue;
      commentsCount[row.status] = Number(row.count);
    }
    const reactionCount = emptyReactions();
    for (const row of reactionRows) {
      if (row.articleId !== article.id) continue;
      reactionCount[row.type] = Number(row.count);
    }
    return {
      slug: article.slug,
      title: titleFor(article.slug, localeRows.filter((locale) => locale.articleId === article.id)),
      publishedOn: article.publishedOn,
      comments: commentsCount,
      reactions: reactionCount,
    };
  });
  articlesOut.sort((a, b) => b.publishedOn.localeCompare(a.publishedOn) || a.slug.localeCompare(b.slug));
  return { status: 200 as const, body: { articles: articlesOut } };
}
