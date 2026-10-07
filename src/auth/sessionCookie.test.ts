import { embeddedSessionCookie } from "./sessionCookie";

it("lets the portfolio iframe send the session cookie", () => {
  expect(embeddedSessionCookie()).toMatchObject({ sameSite: "none", secure: true });
});
