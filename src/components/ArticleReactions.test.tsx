import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocaleProvider } from "../context/LocaleContext";
import { ThemeProvider } from "../context/ThemeContext";
import { ArticleReactions } from "./ArticleReactions";

const types = ["like", "celebrate", "support", "love", "insightful", "funny"] as const;

const summary = {
  reactions: types.map((type) => ({
    type,
    count: type === "like" ? 2 : 0,
    mine: type === "like",
  })),
};

function renderReactions() {
  localStorage.setItem("articles-locale", "pt");
  return render(
    <ThemeProvider>
      <LocaleProvider>
        <ArticleReactions slug="o-agente-secreto" summary={summary} />
      </LocaleProvider>
    </ThemeProvider>,
  );
}

it("shows a pressed like icon and opens the reaction choices", async () => {
  const user = userEvent.setup();
  renderReactions();
  const like = screen.getByRole("button", { name: "Gostei" });
  expect(like).toHaveAttribute("aria-pressed", "true");
  expect(like).toHaveAttribute("title", "Gostei · 2");
  expect(screen.queryByRole("button", { name: "Parabéns" })).not.toBeInTheDocument();
  await user.hover(like);
  expect(screen.getByRole("button", { name: "Parabéns" })).toHaveAttribute("title", "Parabéns · 0");
  await user.click(like);
  expect(screen.getByRole("button", { name: "Apoio" })).toHaveAttribute("title", "Apoio · 0");
  expect(screen.getByRole("button", { name: "Amei" })).toHaveAttribute("title", "Amei · 0");
  expect(screen.getByRole("button", { name: "Genial" })).toHaveAttribute("title", "Genial · 0");
  expect(screen.getByRole("button", { name: "Divertido" })).toHaveAttribute("title", "Divertido · 0");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("sends the stored session id to add and remove a reaction", async () => {
  const sessionId = "6f4b1c0a-6a4e-4b1d-8c3e-1a2b3c4d5e6f";
  localStorage.setItem("articles-session", sessionId);
  const calls: { url: string; method?: string; body?: string }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      calls.push({ url: String(input), method: init?.method, body: init?.body ? String(init.body) : undefined });
      return { ok: true, json: async () => summary };
    }),
  );
  const user = userEvent.setup();
  const view = renderReactions();
  await user.hover(screen.getByRole("button", { name: "Gostei" }));
  await user.click(screen.getByRole("button", { name: "Divertido" }));
  expect(calls[0]).toEqual({
    url: "/api/articles/o-agente-secreto/reactions",
    method: "POST",
    body: JSON.stringify({ type: "funny", sessionId }),
  });

  view.unmount();
  calls.length = 0;
  const pressed = {
    reactions: summary.reactions.map((reaction) =>
      reaction.type === "funny" ? { ...reaction, count: 1, mine: true } : { ...reaction, mine: false },
    ),
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      calls.push({ url: String(input), method: init?.method, body: init?.body ? String(init.body) : undefined });
      return { ok: true, json: async () => pressed };
    }),
  );
  render(
    <ThemeProvider>
      <LocaleProvider>
        <ArticleReactions slug="o-agente-secreto" summary={pressed} />
      </LocaleProvider>
    </ThemeProvider>,
  );
  await user.hover(screen.getByRole("button", { name: "Divertido" }));
  await user.click(within(screen.getByRole("group", { name: "Gostei" })).getByRole("button", { name: "Divertido" }));
  expect(calls[0]).toEqual({
    url: `/api/articles/o-agente-secreto/reactions/funny?sessionId=${sessionId}`,
    method: "DELETE",
    body: undefined,
  });
});
