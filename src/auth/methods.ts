export const authMethodIds = ["github", "gmail", "magiclink", "microsoft", "linkedin"] as const;

export type AuthMethodId = (typeof authMethodIds)[number];

export const authJsProviderId: Record<AuthMethodId, string> = {
  github: "github",
  gmail: "google",
  magiclink: "resend",
  microsoft: "microsoft-entra-id",
  linkedin: "linkedin",
};

export function enabledAuthMethods(value = process.env.AUTH_PROVIDERS): AuthMethodId[] {
  if (process.env.AUTH_LOGIN !== "true") return [];
  const source = value === undefined || value.trim() === "" ? "" : value;
  const wanted = new Set(source.split(",").map((item) => item.trim().toLowerCase()));
  return authMethodIds.filter((id) => wanted.has(id));
}

export function storedAuthMethod(authJsId: string): AuthMethodId | null {
  const found = (Object.entries(authJsProviderId) as [AuthMethodId, string][]).find(([, id]) => id === authJsId);
  return found?.[0] ?? null;
}

type Env = Record<string, string | undefined>;

export function authMethodConfigured(id: AuthMethodId, env: Env = process.env): boolean {
  if (id === "github") return Boolean(env.GITHUB_ID && env.GITHUB_SECRET);
  if (id === "gmail") return Boolean(env.GMAIL_ID && env.GMAIL_SECRET);
  if (id === "microsoft") return Boolean(env.MICROSOFT_ID && env.MICROSOFT_SECRET);
  if (id === "magiclink") return Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);
  return Boolean(env.LINKEDIN_ID && env.LINKEDIN_SECRET);
}

export function listAuthMethods(env: Env = process.env) {
  return enabledAuthMethods(env.AUTH_PROVIDERS).map((id) => ({
    id,
    configured: authMethodConfigured(id, env),
  }));
}
