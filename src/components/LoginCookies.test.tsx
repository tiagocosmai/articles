import { render, screen } from "@testing-library/react";
import { LocaleProvider } from "../context/LocaleContext";
import { LoginCookies } from "./LoginCookies";

it("stays hidden when the blog is not embedded", () => {
  localStorage.setItem("articles-locale", "pt");
  render(
    <LocaleProvider>
      <LoginCookies />
    </LocaleProvider>,
  );
  expect(screen.queryByRole("region", { name: "Cookies de login" })).not.toBeInTheDocument();
});
