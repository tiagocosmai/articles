import { PDFDocument } from "pdf-lib";
import { buildArticlePdf } from "./articlePdf";

describe("article pdf", () => {
  it("builds a PDF that carries the blog citation", async () => {
    const bytes = await buildArticlePdf({
      title: "O Agente Secreto: quem responde?",
      dateLabel: "24 de setembro de 2026",
      blocks: [
        { kind: "h2", text: "Responsabilidade" },
        { kind: "p", text: "Autonomia pode ser delegada. A responsabilidade continua humana." },
        { kind: "li", text: "Dono do processo" },
      ],
      citationLabel: "Citação",
      citation:
        'Cosmai, Tiago. "O Agente Secreto". Blog de Tiago Cosmai, 24 de setembro de 2026. Disponível em: https://tiagocosmai.github.io/blog/o-agente-secreto. Acesso em: 1 de outubro de 2026.',
      url: "https://tiagocosmai.github.io/blog/o-agente-secreto",
    });
    expect(new TextDecoder().decode(bytes).startsWith("%PDF")).toBe(true);
    const loaded = await PDFDocument.load(bytes);
    expect(loaded.getTitle()).toBe("O Agente Secreto: quem responde?");
    expect(loaded.getAuthor()).toBe("Tiago Cosmai");
    expect(loaded.getSubject()).toContain(
      "https://tiagocosmai.github.io/blog/o-agente-secreto",
    );
    expect(loaded.getPageCount()).toBeGreaterThan(0);
  });
});
