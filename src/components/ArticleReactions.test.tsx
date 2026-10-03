import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocaleProvider } from "../context/LocaleContext";
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
    <LocaleProvider>
      <ArticleReactions slug="o-agente-secreto" summary={summary} signedIn={signedIn} />
    </LocaleProvider>,
  );
}

it("shows the six reactions and the pressed like count", () => {
  renderReactions(true);
  expect(screen.getAllByRole("button")).toHaveLength(6);
  const like = screen.getByRole("button", { name: "Gostei" });
  expect(like).toHaveTextContent("2");
  expect(like).toHaveAttribute("aria-pressed", "true");
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
  expect(window.location.href).toBe("/api/auth/signin?callbackUrl=/o-agente-secreto");
});
