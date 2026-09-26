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
