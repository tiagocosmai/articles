import type {
  Article,
  ArticleLocale,
  CatalogError,
  ContentFiles,
  Locale,
} from "../types/content";

const LOCALES: Locale[] = ["pt", "en", "es"];
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateCatalog(
  raw: unknown,
  files: ContentFiles,
): { articles: Article[]; errors: CatalogError[] } {
  if (!isCatalog(raw)) {
    return {
      articles: [],
      errors: [{ slug: "", message: "catalog must be { articles: unknown[] }" }],
    };
  }

  const articles: Article[] = [];
  const errors: CatalogError[] = [];
  const acceptedSlugs = new Set<string>();

  for (const row of raw.articles) {
    const result = validateRow(row, files, acceptedSlugs);
    if (result.article) {
      acceptedSlugs.add(result.article.slug);
      articles.push(result.article);
      continue;
    }
    errors.push(result.error);
  }

  return { articles, errors };
}

function isCatalog(raw: unknown): raw is { articles: unknown[] } {
  return (
    typeof raw === "object" &&
    raw !== null &&
    Array.isArray((raw as { articles?: unknown }).articles)
  );
}

function validateRow(
  row: unknown,
  files: ContentFiles,
  acceptedSlugs: Set<string>,
): { article: Article; error?: undefined } | { article?: undefined; error: CatalogError } {
  if (typeof row !== "object" || row === null) {
    return { error: { slug: "", message: "article must be an object" } };
  }

  const record = row as Record<string, unknown>;
  const slug = typeof record.slug === "string" ? record.slug : "";

  if (!SLUG_RE.test(slug)) {
    return { error: { slug, message: "slug must match /^[a-z0-9]+(?:-[a-z0-9]+)*$/" } };
  }

  if (acceptedSlugs.has(slug)) {
    return { error: { slug, message: "duplicate slug" } };
  }

  if (!isCalendarDate(record.date)) {
    return { error: { slug, message: "date must be a real YYYY-MM-DD calendar date" } };
  }

  const tags = validateTags(record.tags);
  if (typeof tags === "string") {
    return { error: { slug, message: tags } };
  }

  const locales = validateLocales(record.locales, files);
  if (typeof locales === "string") {
    return { error: { slug, message: locales } };
  }

  return {
    article: {
      slug,
      date: record.date,
      tags,
      locales,
    },
  };
}

function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const utc = new Date(Date.UTC(year, month - 1, day));

  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  );
}

function validateTags(tags: unknown): string[] | string {
  if (!Array.isArray(tags) || tags.length === 0) {
    return "tags must be a non-empty list of strings";
  }

  const seen = new Set<string>();
  for (const tag of tags) {
    if (typeof tag !== "string" || tag.length === 0) {
      return "tag must be a non-empty string";
    }
    if (tag.includes("#") || /\s/.test(tag)) {
      return "tag must not contain # or whitespace";
    }
    if (seen.has(tag)) {
      return "duplicate tag";
    }
    seen.add(tag);
  }

  return tags;
}

function validateLocales(
  locales: unknown,
  files: ContentFiles,
): Record<Locale, ArticleLocale> | string {
  if (typeof locales !== "object" || locales === null) {
    return "locales must include pt, en, and es";
  }

  const record = locales as Record<string, unknown>;
  const result = {} as Record<Locale, ArticleLocale>;

  for (const locale of LOCALES) {
    const entry = record[locale];
    if (typeof entry !== "object" || entry === null) {
      return `locales.${locale} is required`;
    }

    const loc = entry as Record<string, unknown>;
    if (!isNonEmptyText(loc.title)) {
      return `locales.${locale}.title is required`;
    }
    if (!isNonEmptyText(loc.description)) {
      return `locales.${locale}.description is required`;
    }
    if (typeof loc.markdown !== "string" || loc.markdown.length === 0) {
      return `locales.${locale}.markdown is required`;
    }
    if (!(loc.markdown in files.markdown)) {
      return `markdown file ${loc.markdown} is missing`;
    }

    const flashName = loc.markdown.replace(/\.md$/, ".json");
    const flashError = validateFlashcards(files.flashcards[flashName], flashName);
    if (flashError) {
      return flashError;
    }

    result[locale] = {
      title: loc.title,
      description: loc.description,
      markdown: loc.markdown,
    };
  }

  return result;
}

function validateFlashcards(raw: unknown, filename: string): string | null {
  if (raw === undefined) {
    return `flashcard file ${filename} is missing`;
  }
  if (typeof raw !== "object" || raw === null || !("cards" in raw)) {
    return `flashcard file ${filename} is missing cards`;
  }

  const cards = (raw as { cards: unknown }).cards;
  if (!Array.isArray(cards) || cards.length === 0) {
    return `flashcard file ${filename} has an empty cards array`;
  }

  const ids = new Set<string>();
  for (const card of cards) {
    if (typeof card !== "object" || card === null) {
      return `flashcard file ${filename} has an invalid card`;
    }

    const { id, front, back } = card as Record<string, unknown>;
    if (!isNonEmptyText(id) || !isNonEmptyText(front) || !isNonEmptyText(back)) {
      return `flashcard file ${filename} has a card with empty id, front, or back`;
    }
    if (ids.has(id)) {
      return `flashcard file ${filename} has a duplicate card id`;
    }
    ids.add(id);
  }

  return null;
}

function isNonEmptyText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
