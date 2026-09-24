export type Locale = "pt" | "en" | "es";

export type ArticleLocale = {
  title: string;
  description: string;
  markdown: string;
};

export type Article = {
  slug: string;
  date: string;
  tags: string[];
  locales: Record<Locale, ArticleLocale>;
};

export type Flashcard = { id: string; front: string; back: string };

export type ContentFiles = {
  markdown: Record<string, string>;
  flashcards: Record<string, { cards: Flashcard[] } | unknown>;
};

export type CatalogError = { slug: string; message: string };
