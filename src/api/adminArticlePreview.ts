import { asc, eq, inArray } from "drizzle-orm";
import type { AdminPost } from "./adminPosts";
import { isPublishedOnOrBefore, todayUtcDate } from "../db/publishDate";
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
import type { Article, ArticleTag, Flashcard, Locale } from "../types/content";
import type { ReaderSession } from "./reactions";

const locales: Locale[] = ["pt", "en", "es"];

export type AdminArticlePreview = {
  slug: string;
  publishedOn: string;
  state: AdminPost["state"];
  article: Article;
  markdown: Record<string, string>;
  flashcards: Record<string, Flashcard[]>;
  linkedinPosts: Partial<Record<Locale, string>>;
};

function denied(session: ReaderSession) {
  if (!session) return { status: 401 as const, body: { message: "unauthorized" as const } };
  if (session.role !== "admin") return { status: 403 as const, body: { message: "forbidden" as const } };
  return null;
}

function postState(
  article: { publishedOn: string; deletedAt: Date | null },
  localeRows: { body: string }[],
): AdminPost["state"] {
  const bodies = locales.map((_, index) => localeRows[index]?.body ?? "");
  if (bodies.some((body) => body.trim() === "")) return "empty";
  if (article.deletedAt) return "hidden";
  if (!isPublishedOnOrBefore(article.publishedOn, todayUtcDate())) return "scheduled";
  return "live";
}

export async function getAdminArticlePreview(db: TestDatabase, session: ReaderSession, slug: string) {
  const blocked = denied(session);
  if (blocked) return blocked;

  const [article] = await db.select().from(articles).where(eq(articles.slug, slug));
  if (!article) return { status: 404 as const, body: { message: "not found" as const } };

  const translations = await db.select().from(articleLocales).where(eq(articleLocales.articleId, article.id));
  const linkRows = await db
    .select()
    .from(articleTags)
    .where(eq(articleTags.articleId, article.id))
    .orderBy(asc(articleTags.position));
  const tagIds = [...new Set(linkRows.map((link) => link.tagId))];
  const tagRows = tagIds.length === 0 ? [] : await db.select().from(tags).where(inArray(tags.id, tagIds));
  const labelRows = tagIds.length === 0 ? [] : await db.select().from(tagLocales).where(inArray(tagLocales.tagId, tagIds));
  const cardRows = await db
    .select()
    .from(flashcards)
    .where(eq(flashcards.articleId, article.id))
    .orderBy(asc(flashcards.position));
  const linkedInRows = await db
    .select()
    .from(articleLinkedinPosts)
    .where(eq(articleLinkedinPosts.articleId, article.id));

  const codeByTag = new Map(tagRows.map((tag) => [tag.id, tag.code]));
  const labelsByTag = new Map<string, Partial<Record<Locale, string>>>();
  for (const label of labelRows) {
    const current = labelsByTag.get(label.tagId) ?? {};
    current[label.locale] = label.label;
    labelsByTag.set(label.tagId, current);
  }

  const articleTagsForPage: ArticleTag[] = [];
  for (const link of linkRows) {
    const code = codeByTag.get(link.tagId);
    const labels = labelsByTag.get(link.tagId);
    if (!code || !labels?.pt || !labels.en || !labels.es) continue;
    articleTagsForPage.push({ id: code, pt: labels.pt, en: labels.en, es: labels.es });
  }

  const markdown: Record<string, string> = {};
  const cards: Record<string, Flashcard[]> = {};
  const localesForPage = {} as Article["locales"];
  for (const locale of locales) {
    const row = translations.find((item) => item.locale === locale);
    const filename = `${article.slug}.${locale}.md`;
    localesForPage[locale] = {
      title: row?.title ?? "",
      description: row?.description ?? "",
      markdown: filename,
    };
    markdown[filename] = row?.body ?? "";
    const deck = cardRows
      .filter((card) => card.locale === locale)
      .map((card) => ({ id: card.code, front: card.front, back: card.back }));
    if (deck.length > 0) cards[`${article.slug}.${locale}.json`] = deck;
  }

  const linkedinPosts: Partial<Record<Locale, string>> = {};
  for (const row of linkedInRows) linkedinPosts[row.locale] = row.body;

  const orderedLocales = locales.map((locale) => translations.find((item) => item.locale === locale) ?? { body: "" });

  return {
    status: 200 as const,
    body: {
      slug: article.slug,
      publishedOn: article.publishedOn,
      state: postState(article, orderedLocales),
      article: {
        slug: article.slug,
        date: article.publishedOn,
        tags: articleTagsForPage,
        locales: localesForPage,
      },
      markdown,
      flashcards: cards,
      linkedinPosts,
    } satisfies AdminArticlePreview,
  };
}
