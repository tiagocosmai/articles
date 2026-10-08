import type { Flashcard, Locale } from "../types/content";
import { PORTFOLIO_ORIGIN } from "../share/articleShareUrl";
import { slugOf } from "./editorialSlug";

export type EditorialLocale = {
  title: string;
  description: string;
  objective: string;
  body: string;
  tagLabels: string[];
  flashcards: Flashcard[];
  linkedIn: string;
};

export type ParsedEditorial = {
  slug: string;
  locales: Record<Locale, EditorialLocale>;
};

const localeHeaders: Record<Locale, RegExp> = {
  pt: /^#\s*Portugu[eê]s\s*$/im,
  en: /^#\s*English\s*$/im,
  es: /^#\s*Espa[nñ]ol\s*$/im,
};

const sectionArticle = /^##\s*(Artigo|Article|Artículo)\s*$/im;
const sectionTags =
  /^##\s*(Nuvem de tags \/ palavras-chave|Tag cloud \/ keywords|Nube de etiquetas \/ palabras clave)\s*$/im;
const sectionFlashcards = /^##\s*Flashcards\s*$/im;
const sectionLinkedIn =
  /^##\s*(Post para o LinkedIn|LinkedIn post|Publicaci[oó]n para LinkedIn)\s*$/im;

export function parseEditorialMarkdown(source: string): ParsedEditorial | string[] {
  const slugMatch = source.match(/Slug sugerido:\s*([a-z0-9-]+)/i);
  const slug = slugMatch ? slugOf(slugMatch[1]) : null;
  if (!slug) return ["Slug sugerido ausente ou inválido no comentário inicial."];

  const errors: string[] = [];
  const locales = {} as Record<Locale, EditorialLocale>;

  for (const locale of ["pt", "en", "es"] as const) {
    const block = extractLocaleBlock(source, locale);
    if (!block) {
      errors.push(`Seção ${localeLabel(locale)} ausente.`);
      continue;
    }
    const parsed = parseLocaleBlock(block, locale, slug);
    if (typeof parsed === "string") errors.push(`${localeLabel(locale)}: ${parsed}`);
    else locales[locale] = parsed;
  }

  if (errors.length > 0) return errors;

  const tagCounts = (["pt", "en", "es"] as const).map((locale) => locales[locale].tagLabels.length);
  if (tagCounts[0] !== tagCounts[1] || tagCounts[1] !== tagCounts[2]) {
    return ["As listas de tags precisam ter o mesmo número de itens em pt, en e es."];
  }

  return { slug, locales };
}

function localeLabel(locale: Locale): string {
  return locale === "pt" ? "Português" : locale === "en" ? "English" : "Español";
}

function extractLocaleBlock(source: string, locale: Locale): string | null {
  const header = localeHeaders[locale];
  const match = header.exec(source);
  if (!match) return null;
  const start = match.index + match[0].length;
  const rest = source.slice(start);
  const nextHeader = rest.search(/^#\s*(Portugu[eê]s|English|Espa[nñ]ol)\s*$/im);
  const end = nextHeader === -1 ? rest.length : nextHeader;
  return rest.slice(0, end).trim();
}

function parseLocaleBlock(block: string, locale: Locale, slug: string): EditorialLocale | string {
  const titleMatch = block.match(/^##\s+(.+?)\s*$/m);
  if (!titleMatch) return "título ausente";
  const title = titleMatch[1].trim();
  if (!title) return "título vazio";

  const description = fieldValue(block, "**Descrição:**", "**Description:**", "**Descripción:**");
  if (!description) return "descrição ausente";

  const objective = fieldValue(block, "**Objetivo:**", "**Objective:**");
  if (!objective) return "objetivo ausente";

  const articleBody = sectionBody(block, sectionArticle, [
    sectionTags,
    sectionFlashcards,
    sectionLinkedIn,
  ]);
  if (!articleBody) return "corpo do artigo ausente";

  const tagsRaw = sectionBody(block, sectionTags, [sectionFlashcards, sectionLinkedIn]);
  if (!tagsRaw) return "tags ausentes";
  const tagLabels = tagsRaw
    .split(/[,，]/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (tagLabels.length === 0) return "tags vazias";

  const flashRaw = sectionBody(block, sectionFlashcards, [sectionLinkedIn]);
  if (!flashRaw) return "flashcards ausentes";
  const flashcards = parseFlashcardTable(flashRaw);
  if (typeof flashcards === "string") return flashcards;

  const linkedRaw = sectionBody(block, sectionLinkedIn, []);
  if (!linkedRaw) return "post do LinkedIn ausente";
  const linkedIn = normalizeLinkedIn(linkedRaw.replace(/\n---+\s*$/g, "").trim(), slug, locale);
  if (!linkedIn) return "post do LinkedIn vazio";

  return { title, description, objective, body: articleBody.trim(), tagLabels, flashcards, linkedIn };
}

function fieldValue(block: string, ...labels: string[]): string | null {
  for (const label of labels) {
    const index = block.indexOf(label);
    if (index === -1) continue;
    const after = block.slice(index + label.length);
    const end = after.search(/\n\*\*|\n##\s/);
    const value = (end === -1 ? after : after.slice(0, end)).trim();
    if (value) return value;
  }
  return null;
}

function sectionBody(block: string, startPattern: RegExp, stopPatterns: RegExp[]): string | null {
  const match = startPattern.exec(block);
  if (!match) return null;
  const start = match.index + match[0].length;
  let end = block.length;
  for (const stop of stopPatterns) {
    const found = stop.exec(block.slice(start));
    if (found && found.index < end - start) end = start + found.index;
  }
  const body = block.slice(start, end).trim();
  return body.length > 0 ? body : null;
}

function parseFlashcardTable(raw: string): Flashcard[] | string {
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && !line.includes("---"));
  if (lines.length === 0) return "tabela de flashcards inválida";

  const cards: Flashcard[] = [];
  const ids = new Set<string>();
  for (const line of lines) {
    const cells = line
      .split("|")
      .map((cell) => cell.trim())
      .filter((cell) => cell.length > 0);
    if (cells.length < 3) continue;
    if (cells[0] === "#" || cells[0].toLowerCase() === "pergunta" || cells[0].toLowerCase() === "question") {
      continue;
    }
    const id = cells[0].replace(/\D/g, "") || String(cards.length + 1);
    const front = cells[1];
    const back = cells[2];
    if (!front || !back) return "flashcard com pergunta ou resposta vazia";
    if (ids.has(id)) return "flashcard com número repetido";
    ids.add(id);
    cards.push({ id, front, back });
  }
  if (cards.length === 0) return "nenhum flashcard válido";
  return cards;
}

export function normalizeLinkedIn(raw: string, slug: string, locale: Locale): string {
  const filtered = raw
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith(">")) return true;
      return !/link sugerido|suggested link|enlace sugerido|not yet published|todav[ií]a no publicado|aún no publicado/i.test(
        trimmed,
      );
    })
    .join("\n")
    .trim();

  const canonical = `${PORTFOLIO_ORIGIN}/${locale}/blog/${slug}`;
  return filtered.replace(/https:\/\/tiagocosmai\.github\.io(?:\/(?:pt|en|es))?\/blog\/[^\s)\]]+/gi, canonical);
}

export function tagCodeFromPortugueseLabel(label: string): string {
  const parts = label
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  if (parts.length === 0) return "";
  return parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join("");
}
