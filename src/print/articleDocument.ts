import type { Locale } from "../types/content";

export type ArticleBlock =
  | { kind: "h2" | "h3"; text: string }
  | { kind: "p"; text: string }
  | { kind: "li"; text: string };

export function articleCitation(input: {
  locale: Locale;
  title: string;
  articleDate: string;
  url: string;
  accessDate: string;
}): string {
  const { title, articleDate, url, accessDate } = input;
  if (input.locale === "en") {
    return `Cosmai, Tiago. "${title}". Tiago Cosmai's blog, ${articleDate}. Available at: ${url}. Accessed on: ${accessDate}.`;
  }
  if (input.locale === "es") {
    return `Cosmai, Tiago. "${title}". Blog de Tiago Cosmai, ${articleDate}. Disponible en: ${url}. Consultado el: ${accessDate}.`;
  }
  return `Cosmai, Tiago. "${title}". Blog de Tiago Cosmai, ${articleDate}. Disponível em: ${url}. Acesso em: ${accessDate}.`;
}

export function articlePdfFilename(slug: string): string {
  return `${slug}.pdf`;
}

/** Turns the essay markdown into blocks for the printout and the PDF. */
export function markdownToBlocks(markdown: string): ArticleBlock[] {
  const blocks: ArticleBlock[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let paragraph: string[] = [];

  const flushParagraph = () => {
    const text = inlineText(paragraph.join(" ").trim());
    paragraph = [];
    if (text) blocks.push({ kind: "p", text });
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      continue;
    }
    if (trimmed.startsWith("# ")) {
      flushParagraph();
      continue;
    }
    const heading = /^(#{2,3}) (.+)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      blocks.push({
        kind: heading[1].length === 2 ? "h2" : "h3",
        text: inlineText(heading[2]),
      });
      continue;
    }
    if (trimmed.startsWith("- ")) {
      flushParagraph();
      blocks.push({ kind: "li", text: inlineText(trimmed.slice(2)) });
      continue;
    }
    paragraph.push(trimmed);
  }
  flushParagraph();
  return blocks;
}

function inlineText(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1 ($2)")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1");
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function articlePrintHtml(input: {
  title: string;
  dateLabel: string;
  blocks: ArticleBlock[];
  citationLabel: string;
  citation: string;
}): string {
  const body = input.blocks
    .map((block) => {
      const text = escapeHtml(block.text);
      if (block.kind === "h2") return `<h2>${text}</h2>`;
      if (block.kind === "h3") return `<h3>${text}</h3>`;
      if (block.kind === "li") return `<li>${text}</li>`;
      return `<p>${text}</p>`;
    })
    .join("\n")
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g, (list) => `<ul>\n${list}</ul>\n`);

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(input.title)}</title>
  <style>
    @page { size: A4; margin: 18mm; }
    body { margin: 0; color: #111; background: #fff; font: 12pt/1.5 Georgia, "Times New Roman", serif; }
    h1 { font-size: 20pt; line-height: 1.25; margin: 0 0 8pt; }
    .meta { margin: 0 0 18pt; color: #333; font-size: 11pt; }
    h2 { font-size: 14pt; margin: 18pt 0 6pt; }
    h3 { font-size: 12pt; margin: 14pt 0 6pt; }
    p, li { margin: 0 0 8pt; }
    ul { margin: 0 0 8pt; padding-left: 18pt; }
    .citation { margin-top: 24pt; padding-top: 10pt; border-top: 1px solid #bbb; font-size: 10pt; line-height: 1.4; }
    .citation h2 { font-size: 11pt; margin: 0 0 6pt; }
  </style>
</head>
<body>
  <h1>${escapeHtml(input.title)}</h1>
  <p class="meta">Tiago Cosmai · ${escapeHtml(input.dateLabel)}</p>
  ${body}
  <section class="citation">
    <h2>${escapeHtml(input.citationLabel)}</h2>
    <p>${escapeHtml(input.citation)}</p>
  </section>
</body>
</html>`;
}
