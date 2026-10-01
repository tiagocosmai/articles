import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { ArticleBlock } from "./articleDocument";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 54;
const BOTTOM = 48;

export async function buildArticlePdf(input: {
  title: string;
  dateLabel: string;
  blocks: ArticleBlock[];
  citationLabel: string;
  citation: string;
  url: string;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(input.title);
  doc.setAuthor("Tiago Cosmai");
  doc.setSubject(input.citation);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const oblique = await doc.embedFont(StandardFonts.HelveticaOblique);
  const safe = (value: string) => toWinAnsi(value, regular);

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const newPage = () => {
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  };

  const ensure = (height: number) => {
    if (y - height < BOTTOM) newPage();
  };

  const write = (text: string, font: PDFFont, size: number, gapAfter: number) => {
    const lines = wrap(safe(text), font, size, PAGE_WIDTH - MARGIN * 2);
    for (const line of lines) {
      ensure(size + 4);
      page.drawText(line, { x: MARGIN, y: y - size, size, font, color: rgb(0.07, 0.07, 0.07) });
      y -= size + 4;
    }
    y -= gapAfter;
  };

  write(input.title, bold, 18, 6);
  write(`Tiago Cosmai · ${input.dateLabel}`, regular, 11, 14);
  for (const block of input.blocks) {
    if (block.kind === "h2") write(block.text, bold, 14, 6);
    else if (block.kind === "h3") write(block.text, bold, 12, 4);
    else if (block.kind === "li") write(`• ${block.text}`, regular, 11, 2);
    else write(block.text, regular, 11, 6);
  }
  y -= 12;
  write(input.citationLabel, bold, 11, 4);
  write(input.citation, oblique, 10, 0);

  for (const item of doc.getPages()) {
    drawFooter(item, safe(input.url), oblique);
  }
  return doc.save();
}

export function downloadArticlePdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function drawFooter(page: PDFPage, url: string, font: PDFFont) {
  page.drawText(url, {
    x: MARGIN,
    y: 28,
    size: 8,
    font,
    color: rgb(0.25, 0.25, 0.25),
  });
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let line = "";
  const width = (value: string) => font.widthOfTextAtSize(value, size);
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (width(next) <= maxWidth) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    if (width(word) <= maxWidth) {
      line = word;
      continue;
    }
    let chunk = "";
    for (const char of word) {
      const trial = chunk + char;
      if (width(trial) > maxWidth && chunk) {
        lines.push(chunk);
        chunk = char;
      } else {
        chunk = trial;
      }
    }
    line = chunk;
  }
  if (line) lines.push(line);
  return lines;
}

function toWinAnsi(text: string, font: PDFFont): string {
  const normalized = text
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201C|\u201D/g, '"')
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ");
  let out = "";
  for (const char of normalized) {
    try {
      font.widthOfTextAtSize(char, 12);
      out += char;
    } catch {
      out += " ";
    }
  }
  return out;
}
