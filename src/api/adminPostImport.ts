import { and, eq } from "drizzle-orm";
import {
  parseEditorialMarkdown,
  tagCodeFromPortugueseLabel,
  type ParsedEditorial,
} from "../content/editorialMarkdown";
import { addUtcDays, todayUtcDate } from "../db/publishDate";
import {
  articleLinkedinPosts,
  articleLocales,
  articleTags,
  articles,
  flashcards,
  tagLocales,
  tags,
} from "../db/schema";
import type { TestDatabase } from "../db/testDb";
import type { Locale } from "../types/content";
import { loadPost, type AdminPost } from "./adminPosts";
import type { ReaderSession } from "./reactions";

const locales: Locale[] = ["pt", "en", "es"];

function denied(session: ReaderSession) {
  if (!session) return { status: 401 as const, body: { message: "unauthorized" as const } };
  if (session.role !== "admin") return { status: 403 as const, body: { message: "forbidden" as const } };
  return null;
}

export function validateEditorialImport(markdown: unknown): { status: "invalid"; errors: string[] } | { status: "ready"; slug: string; conflict: boolean } {
  if (typeof markdown !== "string" || markdown.trim() === "") {
    return { status: "invalid", errors: ["Arquivo markdown vazio."] };
  }
  const parsed = parseEditorialMarkdown(markdown);
  if (Array.isArray(parsed)) return { status: "invalid", errors: parsed };
  return { status: "ready", slug: parsed.slug, conflict: false };
}

export async function inspectEditorialImport(db: TestDatabase, markdown: string) {
  const base = validateEditorialImport(markdown);
  if (base.status === "invalid") return base;
  const [existing] = await db.select({ id: articles.id }).from(articles).where(eq(articles.slug, base.slug));
  return { ...base, conflict: Boolean(existing) };
}

async function ensureTags(
  tx: TestDatabase,
  parsed: ParsedEditorial,
): Promise<{ tagId: string; position: number }[]> {
  const result: { tagId: string; position: number }[] = [];
  const count = parsed.locales.pt.tagLabels.length;
  for (let position = 0; position < count; position += 1) {
    const labels = {
      pt: parsed.locales.pt.tagLabels[position] ?? "",
      en: parsed.locales.en.tagLabels[position] ?? "",
      es: parsed.locales.es.tagLabels[position] ?? "",
    };
    if (!labels.pt || !labels.en || !labels.es) {
      throw new Error("tags inconsistentes entre idiomas");
    }
    const code = tagCodeFromPortugueseLabel(labels.pt);
    if (!code) throw new Error("tag inválida");
    const [row] = await tx
      .insert(tags)
      .values({ code })
      .onConflictDoUpdate({ target: tags.code, set: { code } })
      .returning();
    for (const locale of locales) {
      await tx
        .insert(tagLocales)
        .values({ tagId: row.id, locale, label: labels[locale] })
        .onConflictDoUpdate({
          target: [tagLocales.tagId, tagLocales.locale],
          set: { label: labels[locale] },
        });
    }
    result.push({ tagId: row.id, position });
  }
  return result;
}

async function writeEditorialContent(tx: TestDatabase, articleId: string, parsed: ParsedEditorial) {
  for (const locale of locales) {
    const localeData = parsed.locales[locale];
    await tx
      .insert(articleLocales)
      .values({
        articleId,
        locale,
        title: localeData.title,
        description: localeData.description,
        objective: localeData.objective,
        body: localeData.body,
      })
      .onConflictDoUpdate({
        target: [articleLocales.articleId, articleLocales.locale],
        set: {
          title: localeData.title,
          description: localeData.description,
          objective: localeData.objective,
          body: localeData.body,
        },
      });
    await tx
      .insert(articleLinkedinPosts)
      .values({ articleId, locale, body: localeData.linkedIn })
      .onConflictDoUpdate({
        target: [articleLinkedinPosts.articleId, articleLinkedinPosts.locale],
        set: { body: localeData.linkedIn },
      });
  }

  await tx.delete(flashcards).where(eq(flashcards.articleId, articleId));
  for (const locale of locales) {
    const cards = parsed.locales[locale].flashcards;
    if (cards.length === 0) continue;
    await tx.insert(flashcards).values(
      cards.map((card, position) => ({
        articleId,
        locale,
        code: card.id,
        front: card.front,
        back: card.back,
        position,
      })),
    );
  }

  await tx.delete(articleTags).where(eq(articleTags.articleId, articleId));
  const tagLinks = await ensureTags(tx, parsed);
  if (tagLinks.length > 0) {
    await tx.insert(articleTags).values(
      tagLinks.map((link) => ({
        articleId,
        tagId: link.tagId,
        position: link.position,
      })),
    );
  }
}

export async function importEditorialMarkdown(
  db: TestDatabase,
  session: ReaderSession,
  input: unknown,
): Promise<
  | { status: 401 | 403; body: { message: string } }
  | { status: 200; body: { status: "invalid"; errors: string[] } }
  | { status: 200; body: { status: "ready"; slug: string; conflict: boolean } }
  | { status: 200; body: { status: "cancelled" } }
  | { status: 200; body: { status: "created" | "updated"; post: AdminPost } }
  | { status: 400; body: { message: string } }
> {
  const blocked = denied(session);
  if (blocked) return blocked;
  if (typeof input !== "object" || input === null) {
    return { status: 400, body: { message: "invalid payload" } };
  }
  const record = input as Record<string, unknown>;
  const markdown = record.markdown;
  const action = record.action;

  if (action === "cancel") return { status: 200, body: { status: "cancelled" } };

  if (typeof markdown !== "string") return { status: 400, body: { message: "invalid payload" } };

  const parsed = parseEditorialMarkdown(markdown);
  if (Array.isArray(parsed)) return { status: 200, body: { status: "invalid", errors: parsed } };

  const [existing] = await db.select().from(articles).where(eq(articles.slug, parsed.slug));

  if (!action) {
    return {
      status: 200,
      body: { status: "ready", slug: parsed.slug, conflict: Boolean(existing) },
    };
  }

  if (action === "create") {
    if (existing) return { status: 400, body: { message: "slug taken" } };
    const publishedOn = addUtcDays(todayUtcDate(), 7);
    const [created] = await db.transaction(async (tx) => {
      const [article] = await tx.insert(articles).values({ slug: parsed.slug, publishedOn }).returning();
      await writeEditorialContent(tx, article.id, parsed);
      return [article];
    });
    const post = await loadPost(db, created.id);
    if (!post) return { status: 404, body: { message: "not found" } };
    return { status: 200, body: { status: "created", post } };
  }

  if (action === "update") {
    if (!existing) return { status: 400, body: { message: "not found" } };
    await db.transaction(async (tx) => {
      await tx.update(articles).set({ updatedAt: new Date() }).where(eq(articles.id, existing.id));
      await writeEditorialContent(tx, existing.id, parsed);
    });
    const post = await loadPost(db, existing.id);
    if (!post) return { status: 404, body: { message: "not found" } };
    return { status: 200, body: { status: "updated", post } };
  }

  return { status: 400, body: { message: "invalid action" } };
}
