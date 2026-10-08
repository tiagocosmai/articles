import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminFrame } from "./AdminFrame";
import { AdminPosts } from "./AdminPosts";

const post = {
  id: "p1",
  slug: "nota",
  publishedOn: "2026-10-07",
  title: { pt: "Nota", en: "Note", es: "Nota" },
  description: { pt: "d", en: "d", es: "d" },
  state: "live" as const,
  linkedInPt: "Texto do LinkedIn",
};

function json(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

it("shows the posts link and the three states", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      json({
        posts: [
          post,
          { ...post, id: "p2", slug: "oculto", state: "hidden" },
          { ...post, id: "p3", slug: "vazio", title: { pt: "", en: "", es: "Vazio" }, state: "empty" },
        ],
      }),
    ),
  );
  render(
    <AdminFrame view="posts">
      <AdminPosts />
    </AdminFrame>,
  );
  expect(screen.getByRole("tab", { name: "Posts" })).toHaveAttribute("href", "/admin/posts");
  expect(await screen.findByText("No ar")).toBeInTheDocument();
  expect(screen.getByText("Oculto")).toBeInTheDocument();
  expect(screen.getByText("Sem corpo")).toBeInTheDocument();
  expect(screen.getByText("Vazio")).toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: "Visualizar" })[0]).toHaveAttribute("href", "/admin/preview/nota");
});

it("shows the empty sentence", async () => {
  vi.stubGlobal("fetch", vi.fn(() => json({ posts: [] })));
  render(<AdminPosts />);
  expect(await screen.findByText("Não há posts.")).toBeInTheDocument();
});

it("shows the load error without a form", async () => {
  vi.stubGlobal("fetch", vi.fn(() => json({}, 500)));
  render(<AdminPosts />);
  expect(await screen.findByText("Não foi possível carregar.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Salvar" })).not.toBeInTheDocument();
});

it("keeps the form when saving fails", async () => {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "POST") return json({}, 500);
    return json({ posts: [] });
  });
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  render(<AdminPosts />);
  await user.click(await screen.findByRole("button", { name: "Novo post" }));
  await user.type(screen.getByLabelText("Slug"), "nota");
  await user.click(screen.getByRole("button", { name: "Salvar" }));
  expect(await screen.findByText("Não foi possível salvar.")).toBeInTheDocument();
  expect(screen.getByLabelText("Slug")).toHaveValue("nota");
});

it("returns from the form without saving", async () => {
  const fetchMock = vi.fn(() => json({ posts: [post] }));
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  render(<AdminPosts />);
  await user.click(await screen.findByRole("button", { name: "Novo post" }));
  await user.click(screen.getByRole("button", { name: "Voltar" }));
  expect(screen.getByText("Nota")).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("asks to deactivate a live post and leaves the row when that fails", async () => {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "POST") return json({}, 500);
    return json({ posts: [post] });
  });
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  render(<AdminPosts />);
  await user.click(await screen.findByRole("button", { name: "Desativar" }));
  expect(await screen.findByText("Não foi possível salvar.")).toBeInTheDocument();
  expect(screen.getByText("No ar")).toBeInTheDocument();
});
