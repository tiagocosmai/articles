import {
  articleCitation,
  articlePrintHtml,
  markdownToBlocks,
} from "./articleDocument";

const URL = "https://tiagocosmai.github.io/blog/o-agente-secreto";

describe("article printout", () => {
  it("cites the blog in Portuguese, English, and Spanish", () => {
    expect(
      articleCitation({
        locale: "pt",
        title: "O Agente Secreto",
        articleDate: "24 de setembro de 2026",
        url: URL,
        accessDate: "1 de outubro de 2026",
      }),
    ).toBe(
      `Cosmai, Tiago. "O Agente Secreto". Blog de Tiago Cosmai, 24 de setembro de 2026. Disponível em: ${URL}. Acesso em: 1 de outubro de 2026.`,
    );
    expect(
      articleCitation({
        locale: "en",
        title: "The Secret Agent",
        articleDate: "September 24, 2026",
        url: URL,
        accessDate: "October 1, 2026",
      }),
    ).toContain("Available at:");
    expect(
      articleCitation({
        locale: "es",
        title: "El agente secreto",
        articleDate: "24 de septiembre de 2026",
        url: URL,
        accessDate: "1 de octubre de 2026",
      }),
    ).toContain("Consultado el:");
  });

  it("keeps headings, paragraphs, and lists, and drops the repeated title", () => {
    const blocks = markdownToBlocks(
      "# Título\n\nUm parágrafo com **ênfase** e um [link](https://example.com).\n\n## Seção\n\n- Primeiro\n- Segundo\n",
    );
    expect(blocks).toEqual([
      { kind: "p", text: "Um parágrafo com ênfase e um link (https://example.com)." },
      { kind: "h2", text: "Seção" },
      { kind: "li", text: "Primeiro" },
      { kind: "li", text: "Segundo" },
    ]);
  });

  it("puts the citation at the end of the print document", () => {
    const html = articlePrintHtml({
      title: "O Agente Secreto",
      dateLabel: "24 de setembro de 2026",
      blocks: [{ kind: "p", text: "Autonomia pode ser delegada." }],
      citationLabel: "Citação",
      citation: `Disponível em: ${URL}`,
    });
    expect(html).toContain("<h1>O Agente Secreto</h1>");
    expect(html).toContain("Autonomia pode ser delegada.");
    expect(html).toContain("<h2>Citação</h2>");
    expect(html).toContain(`Disponível em: ${URL}`);
  });
});
