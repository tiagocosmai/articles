import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminComments } from "./AdminComments";
import { AdminFrame } from "./AdminFrame";

const report = {
  articles: [
    {
      slug: "o-agente-secreto",
      title: "PT",
      publishedOn: "2026-09-24",
      comments: { pending: 1, approved: 0, rejected: 0 },
      reactions: { like: 0, celebrate: 0, support: 0, love: 0, insightful: 0, funny: 0 },
    },
  ],
};

const pending = {
  id: "c1",
  articleSlug: "o-agente-secreto",
  articleTitle: "PT",
  authorName: "Ada",
  createdAt: "2026-10-01T12:00:00.000Z",
  status: "pending" as const,
  body: "Olá",
  parentId: null,
};

const reply = { ...pending, id: "c2", body: "resposta", parentId: "c1" };

function installFetch({
  comments = [pending, reply],
  listStatus = 200,
  postStatus = 200,
}: {
  comments?: Array<typeof pending | typeof reply>;
  listStatus?: number;
  postStatus?: number;
} = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/admin/report")) return new Response(JSON.stringify(report), { status: 200 });
      if (init?.method === "POST") {
        return new Response(JSON.stringify({ comment: { ...pending, status: "approved" } }), { status: postStatus });
      }
      if (init?.method === "DELETE") return new Response("{}", { status: 200 });
      if (url.includes("/api/admin/comments")) return new Response(JSON.stringify({ comments }), { status: listStatus });
      return new Response("{}", { status: 404 });
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("lists replies and filter links", async () => {
  installFetch();
  render(
    <AdminFrame view="comments">
      <AdminComments status={null} article={null} />
    </AdminFrame>,
  );
  expect(await screen.findByText("Resposta")).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Pendente" })).toHaveAttribute("href", "/admin/comentarios?status=pending");
  expect(screen.getByRole("link", { name: "PT" })).toHaveAttribute("href", "/admin/comentarios?article=o-agente-secreto");
  expect(screen.getAllByRole("link", { name: "Todos" })[0]).toHaveAttribute("href", "/admin/comentarios");
});

it("drops a comment whose new status leaves the active filter", async () => {
  installFetch({ comments: [pending] });
  const user = userEvent.setup();
  render(<AdminComments status="pending" article={null} />);
  const row = await screen.findByRole("row", { name: /Olá/ });
  await user.click(within(row).getByRole("button", { name: "Aprovado" }));
  expect(screen.queryByRole("row", { name: /Olá/ })).not.toBeInTheDocument();
});

it("keeps a comment when every status is visible", async () => {
  installFetch({ comments: [pending] });
  const user = userEvent.setup();
  render(<AdminComments status={null} article={null} />);
  const row = await screen.findByRole("row", { name: /Olá/ });
  await user.click(within(row).getByRole("button", { name: "Aprovado" }));
  expect(await screen.findByRole("row", { name: /approved/ })).toBeInTheDocument();
});

it("does not delete until the confirmation is accepted", async () => {
  installFetch({ comments: [pending] });
  vi.spyOn(window, "confirm").mockReturnValue(false);
  const user = userEvent.setup();
  render(<AdminComments status={null} article={null} />);
  await user.click(await screen.findByRole("button", { name: "Excluir" }));
  const fetchMock = vi.mocked(fetch);
  expect(fetchMock.mock.calls.some((call) => call[1]?.method === "DELETE")).toBe(false);
  expect(screen.getByRole("row", { name: /Olá/ })).toBeInTheDocument();
});

it("removes a comment after it is deleted", async () => {
  installFetch({ comments: [pending] });
  vi.spyOn(window, "confirm").mockReturnValue(true);
  const user = userEvent.setup();
  render(<AdminComments status={null} article={null} />);
  await user.click(await screen.findByRole("button", { name: "Excluir" }));
  expect(screen.queryByRole("row", { name: /Olá/ })).not.toBeInTheDocument();
});

it("shows a load error when the list fails", async () => {
  installFetch({ listStatus: 500 });
  render(<AdminComments status={null} article={null} />);
  expect(await screen.findByText("Não foi possível carregar.")).toBeInTheDocument();
});

it("keeps the row and shows a save error when the status change fails", async () => {
  installFetch({ comments: [pending], postStatus: 500 });
  const user = userEvent.setup();
  render(<AdminComments status={null} article={null} />);
  const row = await screen.findByRole("row", { name: /Olá/ });
  await user.click(within(row).getByRole("button", { name: "Aprovado" }));
  expect(await screen.findByText("Não foi possível salvar.")).toBeInTheDocument();
  expect(screen.getByRole("row", { name: /pending/ })).toBeInTheDocument();
});
