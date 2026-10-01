import type {
  Article,
  ArticleLocale,
  ArticleTag,
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
  const knownTags = new Map<string, string>();

  for (const row of raw.articles) {
    const result = validateRow(row, files, acceptedSlugs, knownTags);
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
  knownTags: Map<string, string>,
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

  const tags = validateTags(record.tags, knownTags);
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

const TAG_TOKEN = /^[A-Za-z0-9]+$/;

function validateTags(
  tags: unknown,
  knownTags: Map<string, string>,
): ArticleTag[] | string {
  if (!Array.isArray(tags) || tags.length === 0) {
    return "tags must be a non-empty list of { id, pt, en, es }";
  }

  const seen = new Set<string>();
  const result: ArticleTag[] = [];
  for (const tag of tags) {
    if (typeof tag !== "object" || tag === null) {
      return "tag must be { id, pt, en, es }";
    }
    const record = tag as Record<string, unknown>;
    const id = record.id;
    if (!isTagToken(id)) {
      return "tag.id must be a token without # or whitespace";
    }
    const labels = {} as Record<Locale, string>;
    for (const locale of LOCALES) {
      const label = record[locale];
      if (!isTagToken(label)) {
        return `tag.${locale} must be a token without # or whitespace`;
      }
      labels[locale] = label;
    }
    if (seen.has(id)) {
      return "duplicate tag";
    }
    seen.add(id);
    const signature = `${labels.pt}\0${labels.en}\0${labels.es}`;
    const known = knownTags.get(id);
    if (known && known !== signature) {
      return `tag ${id} must use the same labels in every article`;
    }
    knownTags.set(id, signature);
    result.push({ id, pt: labels.pt, en: labels.en, es: labels.es });
  }

  return result;
}

function isTagToken(value: unknown): value is string {
  return typeof value === "string" && TAG_TOKEN.test(value);
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
