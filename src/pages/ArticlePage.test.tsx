import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "../App";
import { loadCatalog } from "../content/loadCatalog";
import { LocaleProvider } from "../context/LocaleContext";
import { ThemeProvider } from "../context/ThemeContext";
import type { LoadedContent } from "../types/content";

const PT_TITLE =
  "O Agente Secreto: quem responde quando a IA começa a agir nas organizações?";
const FRONT = "Qual é a diferença entre um assistente e um agente?";
const BACK_START = "Um assistente devolve uma resposta a um pedido.";

function renderAt(path: string, content: LoadedContent = loadCatalog()) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocaleProvider>
        <ThemeProvider>
          <AppRoutes content={content} />
        </ThemeProvider>
      </LocaleProvider>
    </MemoryRouter>,
  );
}

describe("Article", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("articles-locale", "pt");
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("shows the markdown, flips a card, and opens the home tag filter", async () => {
    const user = userEvent.setup();
    renderAt("/o-agente-secreto");

    expect(
      screen.getByText("Autonomia pode ser delegada. Accountability não."),
    ).toBeInTheDocument();
    expect(screen.getByText("24 de setembro de 2026")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Flashcards" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar para o blog" })).toHaveAttribute(
      "href",
      "/",
    );
    const shareText = [
      "Olha esse artigo bacana que eu encontrei...",
      PT_TITLE,
      "Quando a inteligência artificial deixa de responder e passa a agir, a autonomia pode ser delegada, mas a responsabilidade continua humana.",
      "https://tiagocosmai.github.io/pt/blog/o-agente-secreto",
    ].join("\n\n");
    expect(screen.getByRole("link", { name: "Compartilhar no LinkedIn" })).toHaveAttribute(
      "href",
      `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(shareText)}`,
    );
    expect(screen.getByRole("link", { name: "Compartilhar no LinkedIn" })).toHaveAttribute(
      "title",
      "Compartilhar no LinkedIn",
    );
    expect(screen.getByRole("link", { name: "Compartilhar no WhatsApp" })).toHaveAttribute(
      "href",
      `https://wa.me/?text=${encodeURIComponent(shareText)}`,
    );
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    document.execCommand = vi.fn(() => false);
    await user.click(screen.getByRole("button", { name: "Copiar o texto do artigo" }));
    expect(writeText).toHaveBeenCalledWith(shareText);
    expect(screen.getByRole("button", { name: "Texto do artigo copiado" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Copiar o link do artigo" }));
    expect(writeText).toHaveBeenCalledWith(
      "https://tiagocosmai.github.io/pt/blog/o-agente-secreto",
    );
    expect(screen.getByRole("button", { name: "Link do artigo copiado" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Imprimir artigo" }));
    const frame = document.querySelector("iframe");
    expect(frame?.contentDocument?.body.textContent).toContain(
      "Disponível em: https://tiagocosmai.github.io/pt/blog/o-agente-secreto",
    );
    expect(frame?.contentDocument?.body.textContent).toContain(
      "Autonomia pode ser delegada. Accountability não.",
    );
    const downloads: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloads.push(this.download);
    });
    URL.createObjectURL = vi.fn(() => "blob:article-pdf");
    URL.revokeObjectURL = vi.fn();
    await user.click(screen.getByRole("button", { name: "Gerar PDF" }));
    expect(downloads).toEqual(["o-agente-secreto.pdf"]);
    expect(screen.getByRole("searchbox", { name: "Busca" })).toBeInTheDocument();
    expect(screen.getByLabelText("De")).toBeInTheDocument();
    expect(screen.getByLabelText("Até")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "#AI" })).toHaveAttribute(
      "href",
      "/?tag=AI",
    );
    const articleTags = screen.getByRole("list", { name: "Tags do artigo" });
    expect(within(articleTags).getByText("#AI")).toBeInTheDocument();
    expect(within(articleTags).queryByRole("link")).not.toBeInTheDocument();
    expect(
      screen
        .getByRole("heading", { name: "Flashcards" })
        .compareDocumentPosition(articleTags) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    const card = screen.getByText(FRONT).closest("button");
    expect(card).toHaveAttribute("aria-pressed", "false");
    expect(card).toHaveAttribute("aria-label", "Virar para o verso");

    await user.click(screen.getByText(FRONT));

    expect(screen.getByText(new RegExp(BACK_START))).toBeInTheDocument();
    expect(card).toHaveAttribute("aria-pressed", "true");
    expect(card).toHaveAttribute("aria-label", "Virar para a frente");

    await user.click(screen.getByRole("link", { name: "#AI" }));

    expect(screen.getByRole("button", { name: "#AI" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("heading", { name: PT_TITLE })).toBeInTheDocument();
  });

  it.each([
    [
      "en",
      "Share on LinkedIn",
      "Share on WhatsApp",
      "Copy the article text",
      "Copy the article link",
      "Print article",
      "Download PDF",
      "Look at this great article I found...",
      "The Secret Agent: who answers when AI starts acting inside organizations?",
    ],
    [
      "es",
      "Compartir en LinkedIn",
      "Compartir en WhatsApp",
      "Copiar el texto del artículo",
      "Copiar el enlace del artículo",
      "Imprimir artículo",
      "Generar PDF",
      "Mira este artículo buenísimo que encontré...",
      "El agente secreto: ¿quién responde cuando la IA empieza a actuar en las organizaciones?",
    ],
  ] as const)(
    "labels the share actions in %s",
    (locale, linkedIn, whatsApp, copyText, copyUrl, printArticle, downloadPdf, intro, title) => {
      localStorage.setItem("articles-locale", locale);
      renderAt("/o-agente-secreto");
      expect(screen.getByRole("link", { name: linkedIn })).toHaveAttribute("title", linkedIn);
      expect(screen.getByRole("link", { name: whatsApp })).toHaveAttribute("title", whatsApp);
      expect(screen.getByRole("button", { name: copyText })).toHaveAttribute("title", copyText);
      expect(screen.getByRole("button", { name: copyUrl })).toHaveAttribute("title", copyUrl);
      expect(screen.getByRole("button", { name: printArticle })).toHaveAttribute("title", printArticle);
      expect(screen.getByRole("button", { name: downloadPdf })).toHaveAttribute("title", downloadPdf);
      const href = screen.getByRole("link", { name: whatsApp }).getAttribute("href") ?? "";
      const text = decodeURIComponent(href.split("text=")[1] ?? "");
      expect(text).toContain(intro);
      expect(text).toContain(title);
      expect(text).toContain(
        `https://tiagocosmai.github.io/${locale}/blog/o-agente-secreto`,
      );
    },
  );

  it("shows not found for an unknown slug, with a link home", () => {
    renderAt("/missing");

    expect(
      screen.getByRole("heading", { name: "Artigo não encontrado" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Voltar para a home" }),
    ).toHaveAttribute("href", "/");
  });

  it("shows not found for an unknown path", () => {
    renderAt("/no-such-page");

    expect(
      screen.getByRole("heading", { name: "Artigo não encontrado" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Voltar para a home" }),
    ).toHaveAttribute("href", "/");
  });

  it("shows the missing-file warning and does not use another language", () => {
    const content = loadCatalog();
    const markdown = { ...content.markdown };
    delete markdown["o-agente-secreto.pt.md"];

    renderAt("/o-agente-secreto", { ...content, markdown });

    expect(
      screen.getByText("Este arquivo de idioma não está disponível."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Autonomia pode ser delegada. Accountability não."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Autonomy can be delegated. Accountability cannot."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("What is the difference between an assistant and an agent?"),
    ).not.toBeInTheDocument();
  });

  it("shows the missing-file warning when flashcards are absent", () => {
    const content = loadCatalog();
    const flashcards = { ...content.flashcards };
    delete flashcards["o-agente-secreto.pt.json"];

    renderAt("/o-agente-secreto", { ...content, flashcards });

    expect(
      screen.getByText("Este arquivo de idioma não está disponível."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Autonomia pode ser delegada. Accountability não."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Flashcards" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(FRONT)).not.toBeInTheDocument();
  });
});
