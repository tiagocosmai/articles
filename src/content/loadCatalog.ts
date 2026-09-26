import catalog from "../../data/articles.json";
import type { CatalogError, Flashcard, LoadedContent } from "../types/content";
import { validateCatalog } from "./validateCatalog";

const markdownModules = import.meta.glob<string>("../../data/articles/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

const flashcardModules = import.meta.glob("../../data/articles/*.json", {
  import: "default",
  eager: true,
});

function basenameMap<T>(modules: Record<string, T>): Record<string, T> {
  const mapped: Record<string, T> = {};
  for (const [path, value] of Object.entries(modules)) {
    const name = path.split("/").pop();
    if (name) {
      mapped[name] = value;
    }
  }
  return mapped;
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
  const markdown = basenameMap(markdownModules);
  const flashcardFiles = basenameMap(flashcardModules);
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

  return { articles, errors, markdown, flashcards };
}

export function reportCatalogErrors(errors: CatalogError[]): void {
  for (const error of errors) {
    console.error(`[articles] ${error.slug}: ${error.message}`);
  }
}
