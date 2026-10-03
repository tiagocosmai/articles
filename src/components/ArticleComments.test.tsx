import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocaleProvider } from "../context/LocaleContext";
import { ThemeProvider } from "../context/ThemeContext";
import { ArticleComments } from "./ArticleComments";

const comment = {
  id: "c1",
  body: "<img src=x onerror=alert(1)>",
  status: "approved" as const,
  parentId: null,
  userName: "Ada",
  createdAt: "2026-10-03T15:00:00.000Z",
  mine: false,
};

function clearCookies() {
  for (const name of ["articles-session", "articles-name", "articles-email"]) {
    document.cookie = `${name}=; Path=/; Max-Age=0`;
    localStorage.removeItem(name);
  }
}

function renderComments() {
  clearCookies();
  localStorage.setItem("articles-locale", "pt");
  return render(
    <ThemeProvider>
      <LocaleProvider>
        <ArticleComments slug="o-agente-secreto" />
      </LocaleProvider>
    </ThemeProvider>,
  );
}

function mockFetch(comments: unknown[] = [], autoApprove = true) {
  const stored = [...comments];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === "POST") {
        const payload = JSON.parse(String(init.body)) as { body: string; parentId: string | null };
        const created = {
          id: "new",
          body: payload.body,
          status: autoApprove ? "approved" as const : "pending" as const,
          parentId: payload.parentId,
          userName: "Ada",
          createdAt: "2026-10-03T15:04:00.000Z",
          mine: true,
        };
        stored.push(created);
        return { ok: true, json: async () => created };
      }
      if (url.includes("/comments")) return { ok: true, json: async () => ({ comments: stored, autoApprove }) };
      return { ok: true, json: async () => ({}) };
    }),
  );
}

it("shows the text as written and counts the characters still available", async () => {
  mockFetch([comment]);
  const { container } = renderComments();
  const user = userEvent.setup();
  expect(await screen.findByText(comment.body)).toBeInTheDocument();
  expect(container.querySelector("img")).toBeNull();
  expect(screen.getByText("1000 restantes")).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Nome" })).toHaveAttribute("placeholder", "Nome");
  expect(screen.getByRole("textbox", { name: "E-mail" })).toHaveAttribute("placeholder", "E-mail");
  expect(screen.getByRole("textbox", { name: "Escreva um comentário" })).toHaveAttribute("placeholder", "Escreva um comentário");
  await user.type(screen.getByRole("textbox", { name: "Escreva um comentário" }), "Oi");
  expect(screen.getByText("998 restantes")).toBeInTheDocument();
});

it("asks for a name and email and publishes when approval is automatic", async () => {
  mockFetch();
  renderComments();
  const user = userEvent.setup();
  await user.type(await screen.findByRole("textbox", { name: "Nome" }), "Ada");
  await user.type(screen.getByRole("textbox", { name: "E-mail" }), "ada@example.com");
  await user.type(screen.getByRole("textbox", { name: "Escreva um comentário" }), "Olá");
  await user.click(screen.getByRole("button", { name: "Publicar" }));
  expect(await screen.findByText("Olá")).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(localStorage.getItem("articles-name")).toBe("Ada");
  expect(localStorage.getItem("articles-email")).toBe("ada@example.com");
  expect(localStorage.getItem("articles-session")).toMatch(/^[0-9a-f-]{36}$/i);
});

it("shows the moderation notice when automatic approval is off", async () => {
  mockFetch([], false);
  renderComments();
  const user = userEvent.setup();
  await user.type(await screen.findByRole("textbox", { name: "Nome" }), "Ada");
  await user.type(screen.getByRole("textbox", { name: "E-mail" }), "ada@example.com");
  await user.type(screen.getByRole("textbox", { name: "Escreva um comentário" }), "Olá");
  await user.click(await screen.findByRole("button", { name: "Enviar para moderação" }));
  expect(await screen.findByText("Seu comentário ficará visível assim que a moderação for concluída.")).toBeInTheDocument();
});

it("refills the name and email from storage", async () => {
  mockFetch();
  clearCookies();
  localStorage.setItem("articles-name", "Ada");
  localStorage.setItem("articles-email", "ada@example.com");
  render(
    <ThemeProvider>
      <LocaleProvider>
        <ArticleComments slug="o-agente-secreto" />
      </LocaleProvider>
    </ThemeProvider>,
  );
  expect(await screen.findByRole("textbox", { name: "Nome" })).toHaveValue("Ada");
  expect(screen.getByRole("textbox", { name: "E-mail" })).toHaveValue("ada@example.com");
});

it("offers one reply level under a comment", async () => {
  mockFetch([comment, { ...comment, id: "c2", parentId: "c1", body: "Resposta", userName: "Grace" }]);
  renderComments();
  const user = userEvent.setup();
  expect(await screen.findByText("Resposta")).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: "Responder" })).toHaveLength(1);
  await user.click(screen.getByRole("button", { name: "Responder" }));
  expect(screen.getByRole("textbox", { name: "Escreva uma resposta" })).toBeInTheDocument();
});
