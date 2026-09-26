import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "../App";

const PT_TITLE =
  "O Agente Secreto: quem responde quando a IA começa a agir nas organizações?";
const EN_TITLE =
  "The Secret Agent: who answers when AI starts acting inside organizations?";
const PT_DESCRIPTION =
  "Quando a inteligência artificial deixa de responder e passa a agir, a autonomia pode ser delegada, mas a responsabilidade continua humana.";

describe("Home", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("articles-locale", "pt");
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("lists the article in Portuguese, switches language, and filters by search and date", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: PT_TITLE }),
    ).toBeInTheDocument();
    expect(screen.getByText("24 de setembro de 2026")).toBeInTheDocument();
    expect(screen.getByText(PT_DESCRIPTION)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: (name) => name.includes(PT_TITLE) }),
    ).toHaveAttribute("href", "/articles/o-agente-secreto");
    expect(screen.getByRole("link", { name: "Portfólio" })).toHaveAttribute(
      "href",
      "https://tiagocosmai.github.io/",
    );
    expect(screen.getByRole("button", { name: "#AI" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    const shell = screen.getByTestId("app-shell");
    expect(shell).toHaveAttribute("data-theme", "dark");
    expect(shell).toHaveClass("min-h-screen", "bg-surface-dark", "text-white");
    expect(screen.getByRole("main")).toHaveClass("max-w-3xl");

    await user.click(screen.getByTestId("lang-en"));

    expect(screen.getByRole("heading", { name: EN_TITLE })).toBeInTheDocument();

    await user.type(screen.getByLabelText("Search"), "zzz");
    expect(screen.getByText("No articles match.")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Search"));
    expect(screen.getByRole("heading", { name: EN_TITLE })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: "2026-09-01" },
    });
    expect(screen.getByText("No articles match.")).toBeInTheDocument();
  });

  it("starts with the tag from the search string selected", () => {
    render(
      <MemoryRouter initialEntries={["/?tag=Lideranca"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "#Lideranca" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("heading", { name: PT_TITLE })).toBeInTheDocument();
  });
});
