import { authMethodConfigured, enabledAuthMethods, storedAuthMethod } from "./methods";

it("turns on GitHub, Gmail, and magic link, and leaves Microsoft and LinkedIn out", () => {
  expect(enabledAuthMethods(undefined)).toEqual(["github", "gmail", "magiclink"]);
  expect(enabledAuthMethods("")).toEqual(["github", "gmail", "magiclink"]);
  expect(enabledAuthMethods("LINKEDIN, github")).toEqual(["github", "linkedin"]);
  expect(enabledAuthMethods("nope")).toEqual([]);
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
