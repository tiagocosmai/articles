import { customFetch } from "@auth/core";
import type { Provider } from "@auth/core/providers";
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import LinkedIn from "next-auth/providers/linkedin";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Resend from "next-auth/providers/resend";
import { articlesAuthAdapter } from "./auth/adapter";
import { linkedinTokenFetch } from "./auth/linkedinToken";
import { listAuthMethods, storedAuthMethod } from "./auth/methods";
import { authReturnUrl } from "./authReturn";
import { getDb } from "./db/client";
import { signInIdentity } from "./db/users";

declare module "next-auth" {
  interface User {
    role?: "member" | "admin";
  }
  interface Session {
    userId: string;
    role: "member" | "admin";
  }
}

function username(provider: string, profile: unknown): string | null {
  if (provider !== "github" || typeof profile !== "object" || profile === null || !("login" in profile)) {
    return null;
  }
  const login = profile.login;
  return typeof login === "string" ? login : null;
}

export const sessionMaxAge = 60 * 24 * 60 * 60;

function authProviders(): Provider[] {
  const ready = new Set(listAuthMethods().filter((method) => method.configured).map((method) => method.id));
  const providers: Provider[] = [];
  if (ready.has("github")) {
    providers.push(GitHub({ clientId: process.env.GITHUB_ID, clientSecret: process.env.GITHUB_SECRET }));
  }
  if (ready.has("gmail")) {
    providers.push(Google({ clientId: process.env.GMAIL_ID, clientSecret: process.env.GMAIL_SECRET }));
  }
  if (ready.has("magiclink")) {
    providers.push(Resend({ apiKey: process.env.RESEND_API_KEY, from: process.env.EMAIL_FROM }));
  }
  if (ready.has("microsoft")) {
    providers.push(
      MicrosoftEntraID({
        clientId: process.env.MICROSOFT_ID,
        clientSecret: process.env.MICROSOFT_SECRET,
        issuer: process.env.MICROSOFT_ISSUER || "https://login.microsoftonline.com/common/v2.0",
      }),
    );
  }
  if (ready.has("linkedin")) {
    providers.push(
      LinkedIn({
        clientId: process.env.LINKEDIN_ID,
        clientSecret: process.env.LINKEDIN_SECRET,
        client: { token_endpoint_auth_method: "client_secret_post" },
        checks: ["state"],
        [customFetch]: linkedinTokenFetch,
      }),
    );
  }
  return providers;
}

const magicLinkReady = listAuthMethods().some((method) => method.id === "magiclink" && method.configured);

export const { handlers, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  adapter: magicLinkReady ? articlesAuthAdapter(getDb()) : undefined,
  session: { strategy: "jwt", maxAge: sessionMaxAge },
  pages: { verifyRequest: "/auth/verify" },
  providers: authProviders(),
  callbacks: {
    async redirect({ url, baseUrl }) {
      return authReturnUrl(url, baseUrl);
    },
    async signIn({ user, account, profile, email }) {
      if (email?.verificationRequest) return true;
      const stored = account ? storedAuthMethod(account.provider) : null;
      if (!account || !stored || !listAuthMethods().some((method) => method.id === stored && method.configured)) {
        return false;
      }
      const current = await auth();
      const signedIn = await signInIdentity(getDb(), {
        provider: stored,
        providerAccountId: account.providerAccountId,
        providerUsername: username(stored, profile),
        name: user.name?.trim() || user.email?.split("@")[0] || "User",
        email: user.email ?? null,
        currentUserId: current?.userId ?? null,
      });
      user.id = signedIn.userId;
      user.role = signedIn.role;
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) token.userId = user.id;
      if (user && "role" in user && (user.role === "admin" || user.role === "member")) token.role = user.role;
      return token;
    },
    async session({ session, token }) {
      if (typeof token.userId === "string") session.userId = token.userId;
      if (token.role === "admin" || token.role === "member") session.role = token.role;
      return session;
    },
  },
});
