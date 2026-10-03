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

it("asks a signed-out reader to sign in", async () => {
  let href = "http://localhost/o-agente-secreto";
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      get href() {
        return href;
      },
      set href(value: string) {
        href = value;
      },
    },
  });
  const user = userEvent.setup();
  renderReactions(false);
  await user.click(screen.getByRole("button", { name: "Gostei" }));
  expect(window.location.href).toBe("/api/auth/signin?callbackUrl=%2Fo-agente-secreto");
});

it("opens sign-in in the top window when the blog is embedded", async () => {
  const top = { location: { href: "https://tiagocosmai.github.io/pt/blog" } };
  const originalTop = window.top;
  Object.defineProperty(window, "top", { configurable: true, value: top });
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { href: "https://tiagocosmai-articles.vercel.app/o-agente-secreto", origin: "https://tiagocosmai-articles.vercel.app" },
  });
  const user = userEvent.setup();
  renderReactions(false);
  await user.click(screen.getByRole("button", { name: "Gostei" }));
  expect(top.location.href).toBe(
    "https://tiagocosmai-articles.vercel.app/api/auth/signin?callbackUrl=https%3A%2F%2Ftiagocosmai.github.io%2Fpt%2Fblog%2Fo-agente-secreto",
  );
  Object.defineProperty(window, "top", { configurable: true, value: originalTop });
});
