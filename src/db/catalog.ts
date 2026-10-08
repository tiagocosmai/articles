import { asc, desc, inArray, isNull } from "drizzle-orm";
import type { Article, ArticleTag, Flashcard, LoadedContent, Locale } from "../types/content";
import { isPublishedOnOrBefore, todayUtcDate } from "./publishDate";
import {
  articleLinkedinPosts,
  articleLocales,
  articleSlugRedirects,
  articleTags,
  articles,
  flashcards,
  tagLocales,
  tags,
} from "./schema";
import type { TestDatabase } from "./testDb";

const locales: Locale[] = ["pt", "en", "es"];

export async function readPublishedCatalog(db: TestDatabase): Promise<LoadedContent> {
  const published = await db
    .select()
    .from(articles)
    .where(isNull(articles.deletedAt))
    .orderBy(desc(articles.publishedOn), asc(articles.slug));

  const empty: LoadedContent = {
    articles: [],
    errors: [],
    markdown: {},
    flashcards: {},
    linkedinPosts: {},
    redirects: [],
  };
  if (published.length === 0) return empty;

  const ids = published.map((article) => article.id);
  const localeRows = await db.select().from(articleLocales).where(inArray(articleLocales.articleId, ids));
  const linkRows = await db
    .select()
    .from(articleTags)
    .where(inArray(articleTags.articleId, ids))
    .orderBy(asc(articleTags.position));
  const tagIds = [...new Set(linkRows.map((link) => link.tagId))];
  const tagRows = tagIds.length === 0 ? [] : await db.select().from(tags).where(inArray(tags.id, tagIds));
  const labelRows = tagIds.length === 0 ? [] : await db.select().from(tagLocales).where(inArray(tagLocales.tagId, tagIds));
  const cardRows = await db
    .select()
    .from(flashcards)
    .where(inArray(flashcards.articleId, ids))
    .orderBy(asc(flashcards.position));

  const codeByTag = new Map(tagRows.map((tag) => [tag.id, tag.code]));
  const labelsByTag = new Map<string, Partial<Record<Locale, string>>>();
  for (const label of labelRows) {
    const current = labelsByTag.get(label.tagId) ?? {};
    current[label.locale] = label.label;
    labelsByTag.set(label.tagId, current);
  }

  const markdown: Record<string, string> = {};
  const cards: Record<string, Flashcard[]> = {};
  const visible: Article[] = [];
  const liveIds: string[] = [];
  const slugById = new Map<string, string>();

  const today = todayUtcDate();
  const linkedInRows =
    ids.length === 0
      ? []
      : await db.select().from(articleLinkedinPosts).where(inArray(articleLinkedinPosts.articleId, ids));
  const linkedinPosts: LoadedContent["linkedinPosts"] = {};

  for (const article of published) {
    if (!isPublishedOnOrBefore(article.publishedOn, today)) continue;
    const translations = localeRows.filter((row) => row.articleId === article.id);
    if (!locales.every((locale) => translations.some((row) => row.locale === locale))) continue;
    if (translations.some((row) => row.body.trim() === "")) continue;

    const articleTagsForPage: ArticleTag[] = [];
    for (const link of linkRows.filter((row) => row.articleId === article.id)) {
      const code = codeByTag.get(link.tagId);
      const labels = labelsByTag.get(link.tagId);
      if (!code || !labels?.pt || !labels.en || !labels.es) continue;
      articleTagsForPage.push({ id: code, pt: labels.pt, en: labels.en, es: labels.es });
    }

    const localesForPage = {} as Article["locales"];
    for (const row of translations) {
      const filename = `${article.slug}.${row.locale}.md`;
      localesForPage[row.locale] = {
        title: row.title,
        description: row.description,
        markdown: filename,
      };
      markdown[filename] = row.body;
      const deck = cardRows
        .filter((card) => card.articleId === article.id && card.locale === row.locale)
        .map((card) => ({ id: card.code, front: card.front, back: card.back }));
      if (deck.length > 0) cards[`${article.slug}.${row.locale}.json`] = deck;
    }

    const linkedInForSlug: Partial<Record<Locale, string>> = {};
    for (const row of linkedInRows.filter((item) => item.articleId === article.id)) {
      linkedInForSlug[row.locale] = row.body;
    }
    if (Object.keys(linkedInForSlug).length > 0) linkedinPosts[article.slug] = linkedInForSlug;

    visible.push({
      slug: article.slug,
      date: article.publishedOn,
      tags: articleTagsForPage,
      locales: localesForPage,
    });
    liveIds.push(article.id);
    slugById.set(article.id, article.slug);
  }

  const redirectRows =
    liveIds.length === 0
      ? []
      : await db.select().from(articleSlugRedirects).where(inArray(articleSlugRedirects.articleId, liveIds));

  return {
    articles: visible,
    errors: [],
    markdown,
    flashcards: cards,
    linkedinPosts,
    redirects: redirectRows.map((row) => ({ from: row.slug, to: slugById.get(row.articleId) ?? row.slug })),
  };
}
