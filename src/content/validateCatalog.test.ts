import type { ContentFiles } from "../types/content";
import { validateCatalog } from "./validateCatalog";

function filesFor(name: string): ContentFiles {
  const card = { cards: [{ id: "a", front: "f", back: "b" }] };
  return {
    markdown: {
      [`${name}.pt.md`]: "# hi",
      [`${name}.en.md`]: "# hi",
      [`${name}.es.md`]: "# hi",
    },
    flashcards: {
      [`${name}.pt.json`]: card,
      [`${name}.en.json`]: card,
      [`${name}.es.json`]: card,
    },
  };
}

function completeItem(name: string) {
  return {
    slug: name,
    date: "2026-09-24",
    tags: [{ id: "AI", pt: "IA", en: "AI", es: "IA" }],
    locales: {
      pt: {
        title: "Título",
        description: "Descrição",
        markdown: `${name}.pt.md`,
      },
      en: {
        title: "Title",
        description: "Description",
        markdown: `${name}.en.md`,
      },
      es: {
        title: "Título",
        description: "Descripción",
        markdown: `${name}.es.md`,
      },
    },
  };
}

describe("validateCatalog", () => {
  it("accepts a complete item when files are present", () => {
    const item = completeItem("o-agente");
    const result = validateCatalog({ articles: [item] }, filesFor("o-agente"));

    expect(result.errors).toEqual([]);
    expect(result.articles).toEqual([item]);
  });

  it("rejects an item missing locales.en.title and omits it from articles", () => {
    const item = completeItem("o-agente");
    const { title: _title, ...enWithoutTitle } = item.locales.en;
    const result = validateCatalog(
      {
        articles: [
          { ...item, locales: { ...item.locales, en: enWithoutTitle } },
        ],
      },
      filesFor("o-agente"),
    );

    expect(result.articles).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.slug).toBe("o-agente");
  });

  it("rejects date 2026-02-31", () => {
    const item = { ...completeItem("o-agente"), date: "2026-02-31" };
    const result = validateCatalog({ articles: [item] }, filesFor("o-agente"));

    expect(result.articles).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.slug).toBe("o-agente");
  });

  it("accepts only the first item when slugs collide and mentions duplicate", () => {
    const first = completeItem("o-agente");
    const second = { ...completeItem("o-agente"), date: "2026-01-01" };
    const result = validateCatalog(
      { articles: [first, second] },
      filesFor("o-agente"),
    );

    expect(result.articles).toEqual([first]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.slug).toBe("o-agente");
    expect(result.errors[0]?.message).toMatch(/duplicate/i);
  });

  it("rejects a markdown filename that is not in files.markdown", () => {
    const item = completeItem("o-agente");
    item.locales.en.markdown = "missing.en.md";
    const result = validateCatalog({ articles: [item] }, filesFor("o-agente"));

    expect(result.articles).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.slug).toBe("o-agente");
  });

  it.each([
    [
      "the flashcard file is missing",
      (files: ReturnType<typeof filesFor>) => {
        delete files.flashcards["o-agente.en.json"];
      },
    ],
    [
      "cards is missing",
      (files: ReturnType<typeof filesFor>) => {
        files.flashcards["o-agente.en.json"] = {};
      },
    ],
    [
      "cards is empty",
      (files: ReturnType<typeof filesFor>) => {
        files.flashcards["o-agente.en.json"] = { cards: [] };
      },
    ],
    [
      "a card front is blank",
      (files: ReturnType<typeof filesFor>) => {
        files.flashcards["o-agente.en.json"] = {
          cards: [{ id: "a", front: "", back: "b" }],
        };
      },
    ],
    [
      "a card id is duplicated",
      (files: ReturnType<typeof filesFor>) => {
        files.flashcards["o-agente.en.json"] = {
          cards: [
            { id: "a", front: "f", back: "b" },
            { id: "a", front: "g", back: "h" },
          ],
        };
      },
    ],
  ])("rejects the item when %s", (_label, mutate) => {
    const files = filesFor("o-agente");
    mutate(files);
    const result = validateCatalog(
      { articles: [completeItem("o-agente")] },
      files,
    );

    expect(result.articles).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.slug).toBe("o-agente");
  });

  it.each([
    [[{ id: "AI", pt: "#IA", en: "AI", es: "IA" }]],
    [[{ id: "AI team", pt: "IA", en: "AI", es: "IA" }]],
    [
      [
        { id: "AI", pt: "IA", en: "AI", es: "IA" },
        { id: "AI", pt: "IA", en: "AI", es: "IA" },
      ],
    ],
    [["AI"]],
  ])(
    "rejects tags %j",
    (tags) => {
      const item = { ...completeItem("o-agente"), tags };
      const result = validateCatalog({ articles: [item] }, filesFor("o-agente"));

      expect(result.articles).toEqual([]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.slug).toBe("o-agente");
    },
  );

  it("rejects slug O-Agente", () => {
    const item = completeItem("O-Agente");
    const result = validateCatalog({ articles: [item] }, filesFor("O-Agente"));

    expect(result.articles).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.slug).toBe("O-Agente");
  });
});
