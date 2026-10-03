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

function renderReactions(signedIn: boolean) {
  localStorage.setItem("articles-locale", "pt");
  return render(
    <ThemeProvider>
      <LocaleProvider>
        <ArticleReactions slug="o-agente-secreto" summary={summary} signedIn={signedIn} />
      </LocaleProvider>
    </ThemeProvider>,
  );
}

it("shows a pressed like icon and opens the reaction choices", async () => {
  const user = userEvent.setup();
  renderReactions(true);
  const like = screen.getByRole("button", { name: "Gostei" });
  expect(like).toHaveAttribute("aria-pressed", "true");
  expect(screen.queryByRole("button", { name: "Parabéns" })).not.toBeInTheDocument();
  await user.hover(like);
  expect(screen.getByRole("button", { name: "Parabéns" })).toBeInTheDocument();
  await user.click(like);
  expect(screen.getByRole("button", { name: "Apoio" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Amei" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Genial" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Divertido" })).toBeInTheDocument();
});

it("explains why a signed-out reader needs to sign in", async () => {
  const user = userEvent.setup();
  renderReactions(false);
  await user.click(screen.getByRole("button", { name: "Gostei" }));
  expect(await screen.findByRole("dialog", { name: "Entre para participar" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Continuar com GitHub" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Continuar com LinkedIn" })).not.toBeInTheDocument();
});
