import { and, asc, desc, eq } from "drizzle-orm";
import { isPublishedOnOrBefore, todayUtcDate } from "../db/publishDate";
import { articleLinkedinPosts, articleLocales, articleSlugRedirects, articles } from "../db/schema";
import type { TestDatabase } from "../db/testDb";
import type { ReaderSession } from "./reactions";

const locales = ["pt", "en", "es"] as const;
type LocaleName = (typeof locales)[number];
type Copy = Record<LocaleName, string>;

export type AdminPost = {
  id: string;
  slug: string;
  publishedOn: string;
  title: Copy;
  description: Copy;
  state: "live" | "hidden" | "empty" | "scheduled";
  linkedInPt: string | null;
};

function denied(session: ReaderSession) {
  if (!session) return { status: 401 as const, body: { message: "unauthorized" as const } };
  if (session.role !== "admin") return { status: 403 as const, body: { message: "forbidden" as const } };
  return null;
}

function text(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function slugOf(value: unknown) {
  if (typeof value !== "string") return null;
  const slug = value.trim().toLowerCase();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : null;
}

function dateOf(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return value;
}

function fields(input: unknown) {
  if (typeof input !== "object" || input === null) return { error: "invalid slug" as const };
  const record = input as Record<string, unknown>;
  const slug = slugOf(record.slug);
  if (!slug) return { error: "invalid slug" as const };
  const publishedOn = dateOf(record.publishedOn);
  if (!publishedOn) return { error: "invalid date" as const };
  const title = {} as Copy;
  const description = {} as Copy;
  for (const locale of locales) {
    const source = record.title;
    const value = text(typeof source === "object" && source !== null ? (source as Record<string, unknown>)[locale] : undefined);
    if (!value) return { error: "invalid title" as const };
    title[locale] = value;
  }
  for (const locale of locales) {
    const source = record.description;
    const value = text(
      typeof source === "object" && source !== null ? (source as Record<string, unknown>)[locale] : undefined,
    );
    if (!value) return { error: "invalid description" as const };
    description[locale] = value;
  }
  return { slug, publishedOn, title, description };
}

function present(
  article: { id: string; slug: string; publishedOn: string; deletedAt: Date | null },
  localeRows: { locale: string; title: string; description: string; body: string }[],
): AdminPost {
  const title = {} as Copy;
  const description = {} as Copy;
  const bodies: string[] = [];
  for (const locale of locales) {
    const row = localeRows.find((item) => item.locale === locale);
    title[locale] = row?.title ?? "";
    description[locale] = row?.description ?? "";
    bodies.push(row?.body ?? "");
  }
  let state: AdminPost["state"] = "live";
  if (bodies.some((body) => body.trim() === "")) state = "empty";
  else if (article.deletedAt) state = "hidden";
  else if (!isPublishedOnOrBefore(article.publishedOn, todayUtcDate())) state = "scheduled";
  return {
    id: article.id,
    slug: article.slug,
    publishedOn: article.publishedOn,
    title,
    description,
    state,
    linkedInPt: null,
  };
}

export async function loadPost(db: TestDatabase, id: string, linkedInPt: string | null = null): Promise<AdminPost | null> {
  const [article] = await db.select().from(articles).where(eq(articles.id, id));
  if (!article) return null;
  const localeRows = await db.select().from(articleLocales).where(eq(articleLocales.articleId, id));
  const post = present(article, localeRows);
  post.linkedInPt = linkedInPt;
  return post;
}

async function ownerOf(db: TestDatabase, slug: string) {
  const [article] = await db.select({ id: articles.id }).from(articles).where(eq(articles.slug, slug));
  if (article) return article.id;
  const [redirect] = await db
    .select({ articleId: articleSlugRedirects.articleId })
    .from(articleSlugRedirects)
    .where(eq(articleSlugRedirects.slug, slug));
  return redirect?.articleId ?? null;
}

async function writeCopy(db: TestDatabase, id: string, title: Copy, description: Copy) {
  for (const locale of locales) {
    await db
      .update(articleLocales)
      .set({ title: title[locale], description: description[locale] })
      .where(and(eq(articleLocales.articleId, id), eq(articleLocales.locale, locale)));
  }
}

export async function listAdminPosts(db: TestDatabase, session: ReaderSession) {
  const blocked = denied(session);
  if (blocked) return blocked;
  const rows = await db.select().from(articles).orderBy(desc(articles.publishedOn), asc(articles.slug));
  const localeRows = await db.select().from(articleLocales);
  const linkedInRows = await db
    .select()
    .from(articleLinkedinPosts)
    .where(eq(articleLinkedinPosts.locale, "pt"));
  const linkedInByArticle = new Map(linkedInRows.map((row) => [row.articleId, row.body]));
  return {
    status: 200 as const,
    body: {
      posts: rows.map((article) => {
        const post = present(
          article,
          localeRows.filter((row) => row.articleId === article.id),
        );
        post.linkedInPt = linkedInByArticle.get(article.id) ?? null;
        return post;
      }),
    },
  };
}

export async function createAdminPost(db: TestDatabase, session: ReaderSession, input: unknown) {
  const blocked = denied(session);
  if (blocked) return blocked;
  const parsed = fields(input);
  if ("error" in parsed) return { status: 400 as const, body: { message: parsed.error } };
  if (await ownerOf(db, parsed.slug)) return { status: 400 as const, body: { message: "slug taken" as const } };
  const [article] = await db.transaction(async (tx) => {
    const [created] = await tx.insert(articles).values({ slug: parsed.slug, publishedOn: parsed.publishedOn }).returning();
    await tx.insert(articleLocales).values(
      locales.map((locale) => ({
        articleId: created.id,
        locale,
        title: parsed.title[locale],
        description: parsed.description[locale],
        body: "",
      })),
    );
    return [created];
  });
  const post = await loadPost(db, article.id);
  if (!post) return { status: 404 as const, body: { message: "not found" as const } };
  return { status: 200 as const, body: { post } };
}

export async function updateAdminPost(db: TestDatabase, session: ReaderSession, id: string, input: unknown) {
  const blocked = denied(session);
  if (blocked) return blocked;
  const parsed = fields(input);
  if ("error" in parsed) return { status: 400 as const, body: { message: parsed.error } };
  const current = await loadPost(db, id);
  if (!current) return { status: 404 as const, body: { message: "not found" as const } };
  if (parsed.slug !== current.slug) {
    const owner = await ownerOf(db, parsed.slug);
    if (owner && owner !== id) return { status: 400 as const, body: { message: "slug taken" as const } };
    await db.transaction(async (tx) => {
      await tx
        .delete(articleSlugRedirects)
        .where(and(eq(articleSlugRedirects.slug, parsed.slug), eq(articleSlugRedirects.articleId, id)));
      await tx.insert(articleSlugRedirects).values({ slug: current.slug, articleId: id });
      await tx
        .update(articles)
        .set({ slug: parsed.slug, publishedOn: parsed.publishedOn, updatedAt: new Date() })
        .where(eq(articles.id, id));
      for (const locale of locales) {
        await tx
          .update(articleLocales)
          .set({ title: parsed.title[locale], description: parsed.description[locale] })
          .where(and(eq(articleLocales.articleId, id), eq(articleLocales.locale, locale)));
      }
    });
  } else {
    await db.update(articles).set({ publishedOn: parsed.publishedOn, updatedAt: new Date() }).where(eq(articles.id, id));
    await writeCopy(db, id, parsed.title, parsed.description);
  }
  const post = await loadPost(db, id);
  if (!post) return { status: 404 as const, body: { message: "not found" as const } };
  return { status: 200 as const, body: { post } };
}

export async function setAdminPostVisibility(db: TestDatabase, session: ReaderSession, id: string, active: unknown) {
  const blocked = denied(session);
  if (blocked) return blocked;
  if (typeof active !== "boolean") return { status: 400 as const, body: { message: "invalid visibility" as const } };
  const [article] = await db.select().from(articles).where(eq(articles.id, id));
  if (!article) return { status: 404 as const, body: { message: "not found" as const } };
  if ((article.deletedAt === null) === active) {
    const post = await loadPost(db, id);
    if (!post) return { status: 404 as const, body: { message: "not found" as const } };
    return { status: 200 as const, body: { post } };
  }
  await db
    .update(articles)
    .set({ deletedAt: active ? null : new Date(), updatedAt: new Date() })
    .where(eq(articles.id, id));
  const post = await loadPost(db, id);
  if (!post) return { status: 404 as const, body: { message: "not found" as const } };
  return { status: 200 as const, body: { post } };
}
