import fs from "fs";
import path from "path";
import type { CatalogError, Flashcard, LoadedContent } from "../types/content";
import { validateCatalog } from "./validateCatalog";

const dataDir = path.join(process.cwd(), "data");
const articlesDir = path.join(dataDir, "articles");

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
}

function isNonEmptyText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validFlashcards(raw: unknown): Flashcard[] | undefined {
  if (typeof raw !== "object" || raw === null || !("cards" in raw)) {
    return undefined;
  }

  const cards = (raw as { cards: unknown }).cards;
  if (!Array.isArray(cards) || cards.length === 0) {
    return undefined;
  }

  const ids = new Set<string>();
  const result: Flashcard[] = [];
  for (const card of cards) {
    if (typeof card !== "object" || card === null) {
      return undefined;
    }

    const { id, front, back } = card as Record<string, unknown>;
    if (!isNonEmptyText(id) || !isNonEmptyText(front) || !isNonEmptyText(back)) {
      return undefined;
    }
    if (ids.has(id)) {
      return undefined;
    }

    ids.add(id);
    result.push({ id, front, back });
  }

  return result;
}

export function loadCatalog(): LoadedContent {
  const catalog = readJson(path.join(dataDir, "articles.json"));
  const markdown: Record<string, string> = {};
  const flashcardFiles: Record<string, unknown> = {};

  for (const name of fs.readdirSync(articlesDir)) {
    const fullPath = path.join(articlesDir, name);
    if (name.endsWith(".md")) {
      markdown[name] = fs.readFileSync(fullPath, "utf8");
    } else if (name.endsWith(".json")) {
      flashcardFiles[name] = readJson(fullPath);
    }
  }

  const { articles, errors } = validateCatalog(catalog, {
    markdown,
    flashcards: flashcardFiles,
  });

  const flashcards: Record<string, Flashcard[]> = {};
  for (const [name, file] of Object.entries(flashcardFiles)) {
    const cards = validFlashcards(file);
    if (cards) {
      flashcards[name] = cards;
    }
  }

  return { articles, errors, markdown, flashcards, redirects: [] };
}

export function reportCatalogErrors(errors: CatalogError[]): void {
  for (const error of errors) {
    console.error(`[articles] ${error.slug}: ${error.message}`);
  }
}
