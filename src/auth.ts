import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import LinkedIn from "next-auth/providers/linkedin";
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

export const { handlers, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    GitHub({ clientId: process.env.GITHUB_ID, clientSecret: process.env.GITHUB_SECRET }),
    LinkedIn({ clientId: process.env.LINKEDIN_ID, clientSecret: process.env.LINKEDIN_SECRET }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      return authReturnUrl(url, baseUrl);
    },
    async signIn({ user, account, profile }) {
      if (!account || (account.provider !== "github" && account.provider !== "linkedin")) return false;
      const current = await auth();
      const signedIn = await signInIdentity(getDb(), {
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        providerUsername: username(account.provider, profile),
        name: user.name ?? "User",
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
