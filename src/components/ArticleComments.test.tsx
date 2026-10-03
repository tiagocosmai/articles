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

function renderComments() {
  localStorage.setItem("articles-locale", "pt");
  return render(
    <ThemeProvider>
      <LocaleProvider>
        <ArticleComments slug="o-agente-secreto" />
      </LocaleProvider>
    </ThemeProvider>,
  );
}

function mockFetch(options: {
  signedIn?: boolean;
  comments?: unknown[];
  createdStatus?: "pending" | "approved";
}) {
  const comments = [...(options.comments ?? [])];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === "POST") {
        const payload = JSON.parse(String(init.body)) as { body: string; parentId: string | null };
        const created = {
          id: "new",
          body: payload.body,
          status: options.createdStatus ?? "approved",
          parentId: payload.parentId,
          userName: "Ada",
          createdAt: "2026-10-03T15:04:00.000Z",
          mine: true,
        };
        comments.push(created);
        return { ok: true, json: async () => created };
      }
      if (url.includes("/comments")) return { ok: true, json: async () => ({ comments }) };
      return { ok: true, json: async () => (options.signedIn ? { userId: "user-1" } : {}) };
    }),
  );
}

it("shows the text as written and counts the characters still available", async () => {
  mockFetch({ comments: [comment] });
  const { container } = renderComments();
  const user = userEvent.setup();
  expect(await screen.findByText(comment.body)).toBeInTheDocument();
  expect(container.querySelector("img")).toBeNull();
  expect(screen.getByText("1000 restantes")).toBeInTheDocument();
  await user.type(screen.getByRole("textbox", { name: "Escreva um comentário" }), "Oi");
  expect(screen.getByText("998 restantes")).toBeInTheDocument();
});

it("publishes an approved comment without the moderation notice", async () => {
  mockFetch({ signedIn: true, createdStatus: "approved" });
  renderComments();
  const user = userEvent.setup();
  await user.type(await screen.findByRole("textbox", { name: "Escreva um comentário" }), "Olá");
  await user.click(screen.getByRole("button", { name: "Publicar" }));
  expect(await screen.findByText("Olá")).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("warns that a pending comment waits for moderation", async () => {
  mockFetch({ signedIn: true, createdStatus: "pending" });
  renderComments();
  const user = userEvent.setup();
  await user.type(await screen.findByRole("textbox", { name: "Escreva um comentário" }), "Olá");
  await user.click(screen.getByRole("button", { name: "Publicar" }));
  expect(await screen.findByRole("dialog")).toHaveTextContent(
    "Seu comentário ficará visível assim que a moderação for concluída.",
  );
});

it("offers one reply level under a comment", async () => {
  mockFetch({
    signedIn: true,
    comments: [comment, { ...comment, id: "c2", parentId: "c1", body: "Resposta", userName: "Grace" }],
  });
  renderComments();
  const user = userEvent.setup();
  expect(await screen.findByText("Resposta")).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: "Responder" })).toHaveLength(1);
  await user.click(screen.getByRole("button", { name: "Responder" }));
  expect(screen.getByRole("textbox", { name: "Escreva uma resposta" })).toBeInTheDocument();
});

it("explains why a signed-out reader needs to sign in", async () => {
  mockFetch({ signedIn: false });
  const open = vi.spyOn(window, "open").mockReturnValue({ closed: true } as Window);
  renderComments();
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Entrar para comentar" }));
  expect(await screen.findByRole("dialog", { name: "Entre para participar" })).toHaveTextContent(
    "Um cookie guarda só essa sessão.",
  );
  await user.click(screen.getByRole("button", { name: "Continuar com GitHub" }));
  expect(String(open.mock.calls[0]?.[0])).toContain("/auth/start?provider=github&next=%2Fo-agente-secreto");
  open.mockRestore();
});
