// @vitest-environment node
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { normalizeLinkedIn, parseEditorialMarkdown, tagCodeFromPortugueseLabel } from "./editorialMarkdown";

const fixtureDir = path.join(process.cwd(), "test/fixtures/editorial");

describe("parseEditorialMarkdown", () => {
  it("parses the three editorial fixtures", () => {
    for (const name of [
      "01-do-codigo-ao-contexto.md",
      "02-melhor-desenvolvedor-proximo-lider.md",
      "03-time-heroi-ou-processo.md",
    ]) {
      const source = fs.readFileSync(path.join(fixtureDir, name), "utf8");
      const parsed = parseEditorialMarkdown(source);
      if (Array.isArray(parsed)) throw new Error(parsed.join("; "));
      expect(parsed.locales.pt.flashcards.length).toBeGreaterThan(0);
      expect(parsed.locales.en.linkedIn).toContain("tiagocosmai.github.io/en/blog/");
      expect(parsed.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("reports missing locale sections", () => {
    const source = fs.readFileSync(path.join(fixtureDir, "01-do-codigo-ao-contexto.md"), "utf8");
    const broken = source.replace(/# English[\s\S]*# Español/, "# Español");
    const errors = parseEditorialMarkdown(broken);
    expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/English/)]));
  });
});

it("normalizes LinkedIn draft warnings and blog URLs", () => {
  const text = normalizeLinkedIn(
    "> Link sugerido\n\nOlá\n\nhttps://tiagocosmai.github.io/blog/exemplo\n\n#Tag",
    "exemplo",
    "pt",
  );
  expect(text).not.toContain("Link sugerido");
  expect(text).toContain("https://tiagocosmai.github.io/pt/blog/exemplo");
});

it("builds tag codes from Portuguese labels", () => {
  expect(tagCodeFromPortugueseLabel("liderança técnica")).toBe("LiderancaTecnica");
  expect(tagCodeFromPortugueseLabel("Tech Lead")).toBe("TechLead");
});
