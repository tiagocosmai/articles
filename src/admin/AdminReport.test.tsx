import { render, screen, within } from "@testing-library/react";
import { AdminFrame } from "./AdminFrame";
import { AdminReport } from "./AdminReport";

const article = {
  slug: "antigo",
  title: "Antigo",
  publishedOn: "2026-09-01",
  comments: { pending: 1, approved: 1, rejected: 1 },
  reactions: { like: 2, celebrate: 0, support: 0, love: 0, insightful: 0, funny: 0 },
};

function json(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(() => json({ articles: [article] })));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

it("shows one row of comment and reaction counts", async () => {
  render(
    <AdminFrame view="report">
      <AdminReport />
    </AdminFrame>,
  );
  expect(screen.getByRole("link", { name: "Relatório" })).toHaveAttribute("href", "/admin");
  expect(screen.getByRole("link", { name: "Comentários" })).toHaveAttribute("href", "/admin/comentarios");
  const row = await screen.findByRole("row", { name: /Antigo/ });
  expect(within(row).getAllByRole("cell").map((cell) => cell.textContent)).toEqual([
    "Antigo",
    "1",
    "1",
    "1",
    "2",
    "0",
    "0",
    "0",
    "0",
    "0",
  ]);
  for (const header of ["Artigo", "Pendentes", "Aprovados", "Recusados", "Gostei", "Parabéns", "Apoio", "Amei", "Genial", "Divertido"]) {
    expect(screen.getByRole("columnheader", { name: header })).toBeInTheDocument();
  }
});

it("shows the load error without a table", async () => {
  vi.stubGlobal("fetch", vi.fn(() => json({}, 500)));
  render(<AdminReport />);
  expect(await screen.findByText("Não foi possível carregar.")).toBeInTheDocument();
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
});

it("shows the empty sentence when there are no articles", async () => {
  vi.stubGlobal("fetch", vi.fn(() => json({ articles: [] })));
  render(<AdminReport />);
  expect(await screen.findByText("Não há itens para o filtro atual.")).toBeInTheDocument();
});
