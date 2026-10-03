import { render, screen } from "@testing-library/react";
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
