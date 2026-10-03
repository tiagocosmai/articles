import { and, eq } from "drizzle-orm";
import type { Adapter, AdapterUser } from "@auth/core/adapters";
import { identities, users, verificationTokens } from "../db/schema";
import type { TestDatabase } from "../db/testDb";
import { signInIdentity } from "../db/users";
import { storedAuthMethod } from "./methods";

function adapterUser(user: { id: string; name: string; email: string | null }): AdapterUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email ?? "",
    emailVerified: null,
  };
}

export function articlesAuthAdapter(db: TestDatabase): Adapter {
  return {
    async createVerificationToken(data) {
      await db.insert(verificationTokens).values(data);
      return data;
    },
    async useVerificationToken(data) {
      const [row] = await db
        .delete(verificationTokens)
        .where(and(eq(verificationTokens.identifier, data.identifier), eq(verificationTokens.token, data.token)))
        .returning();
      return row ?? null;
    },
    async getUser(id) {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user ? adapterUser(user) : null;
    },
    async getUserByEmail(email) {
      const [user] = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .innerJoin(identities, eq(identities.userId, users.id))
        .where(and(eq(users.email, email), eq(identities.provider, "magiclink")));
      return user ? adapterUser(user) : null;
    },
    async getUserByAccount({ provider, providerAccountId }) {
      const stored = storedAuthMethod(provider);
      if (!stored) return null;
      const [user] = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(identities)
        .innerJoin(users, eq(users.id, identities.userId))
        .where(and(eq(identities.provider, stored), eq(identities.providerAccountId, providerAccountId)));
      return user ? adapterUser(user) : null;
    },
    async createUser(user) {
      const [created] = await db
        .insert(users)
        .values({ name: user.name ?? user.email ?? "User", email: user.email })
        .returning();
      return adapterUser(created);
    },
    async updateUser(user) {
      const [updated] = await db
        .update(users)
        .set({ name: user.name ?? undefined, email: user.email, updatedAt: new Date() })
        .where(eq(users.id, user.id))
        .returning();
      return adapterUser(updated);
    },
    async linkAccount(account) {
      const stored = storedAuthMethod(account.provider);
      if (!stored) return;
      const [user] = await db.select().from(users).where(eq(users.id, account.userId));
      if (!user) return;
      await signInIdentity(db, {
        provider: stored,
        providerAccountId: account.providerAccountId,
        providerUsername: null,
        name: user.name,
        email: user.email,
        currentUserId: user.id,
      });
    },
  };
}
