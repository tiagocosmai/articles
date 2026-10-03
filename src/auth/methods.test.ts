import { authMethodConfigured, enabledAuthMethods, storedAuthMethod } from "./methods";

it("keeps every login method off until login is explicitly enabled", () => {
  const previous = process.env.AUTH_LOGIN;
  delete process.env.AUTH_LOGIN;
  expect(enabledAuthMethods("GITHUB,GMAIL,MAGICLINK,MICROSOFT")).toEqual([]);
  process.env.AUTH_LOGIN = "true";
  expect(enabledAuthMethods("GITHUB,GMAIL,MAGICLINK")).toEqual(["github", "gmail", "magiclink"]);
  expect(enabledAuthMethods("LINKEDIN, github")).toEqual(["github", "linkedin"]);
  expect(enabledAuthMethods("nope")).toEqual([]);
  if (previous === undefined) delete process.env.AUTH_LOGIN;
  else process.env.AUTH_LOGIN = previous;
});

it("maps Auth.js ids back to the configured method", () => {
  expect(storedAuthMethod("google")).toBe("gmail");
  expect(storedAuthMethod("resend")).toBe("magiclink");
  expect(storedAuthMethod("microsoft-entra-id")).toBe("microsoft");
  expect(storedAuthMethod("password")).toBeNull();
});

it("treats a method as ready only when its credentials exist", () => {
  expect(authMethodConfigured("github", { GITHUB_ID: "id", GITHUB_SECRET: "secret" })).toBe(true);
  expect(authMethodConfigured("gmail", { GMAIL_ID: "id" })).toBe(false);
  expect(authMethodConfigured("magiclink", { RESEND_API_KEY: "re_test", EMAIL_FROM: "a@b.c" })).toBe(true);
  expect(authMethodConfigured("microsoft", {})).toBe(false);
});
