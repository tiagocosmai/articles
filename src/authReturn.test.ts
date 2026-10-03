import { authReturnUrl } from "./authReturn";

const base = "https://tiagocosmai-articles.vercel.app";

it("keeps a same-site article path", () => {
  expect(authReturnUrl("/o-agente-secreto", base)).toBe(`${base}/o-agente-secreto`);
});

it("returns to the portfolio article after sign-in", () => {
  const portfolio = "https://tiagocosmai.github.io/pt/blog/o-agente-secreto";
  expect(authReturnUrl(portfolio, base)).toBe(portfolio);
});

it("rejects a return address on another site", () => {
  expect(authReturnUrl("https://example.com/phish", base)).toBe(base);
});
