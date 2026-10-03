import { and, eq } from "drizzle-orm";
import type { GuestContact } from "../auth/guest";
import { identities, users } from "./schema";
import type { TestDatabase } from "./testDb";

export const identityProviders = ["github", "linkedin", "gmail", "magiclink", "microsoft", "guest"] as const;
export type IdentityProvider = (typeof identityProviders)[number];

export type IdentityInput = {
  provider: IdentityProvider;
  providerAccountId: string;
  providerUsername: string | null;
  name: string;
  email: string | null;
  currentUserId: string | null;
};

export async function signInIdentity(db: TestDatabase, input: IdentityInput) {
  const [existing] = await db
    .select()
    .from(identities)
    .where(and(eq(identities.provider, input.provider), eq(identities.providerAccountId, input.providerAccountId)));

  if (existing) {
    const [user] = await db
      .update(users)
      .set({ name: input.name, updatedAt: new Date() })
      .where(eq(users.id, existing.userId))
      .returning();
    return { userId: user.id, role: user.role, name: user.name };
  }

  if (input.currentUserId) {
    await db.insert(identities).values({
      userId: input.currentUserId,
      provider: input.provider,
      providerAccountId: input.providerAccountId,
      providerUsername: input.providerUsername,
    });
    const [user] = await db
      .update(users)
      .set({ name: input.name, updatedAt: new Date() })
      .where(eq(users.id, input.currentUserId))
      .returning();
    return { userId: user.id, role: user.role, name: user.name };
  }

  const role = input.provider === "github" && input.providerUsername === "tiagocosmai" ? "admin" : "member";
  const [user] = await db
    .insert(users)
    .values({ name: input.name, email: input.email, role })
    .returning();
  await db.insert(identities).values({
    userId: user.id,
    provider: input.provider,
    providerAccountId: input.providerAccountId,
    providerUsername: input.providerUsername,
  });
  return { userId: user.id, role: user.role, name: user.name };
}

export async function signInGuest(db: TestDatabase, contact: GuestContact) {
  const email = contact.email.trim().toLowerCase();
  return signInIdentity(db, {
    provider: "guest",
    providerAccountId: email,
    providerUsername: null,
    name: contact.name,
    email,
    currentUserId: null,
  });
}

export async function findVisitor(db: TestDatabase, sessionId: string) {
  const [row] = await db
    .select({ id: users.id, role: users.role, name: users.name })
    .from(identities)
    .innerJoin(users, eq(users.id, identities.userId))
    .where(and(eq(identities.provider, "guest"), eq(identities.providerAccountId, sessionId)));
  if (!row) return null;
  return { userId: row.id, role: row.role, name: row.name };
}

export async function signInVisitor(
  db: TestDatabase,
  input: { sessionId: string; name: string | null; email: string | null },
) {
  const existing = await findVisitor(db, input.sessionId);
  if (existing) {
    const [user] = await db
      .update(users)
      .set({
        ...(input.name ? { name: input.name } : {}),
        ...(input.email ? { email: input.email } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.userId))
      .returning();
    return { userId: user.id, role: user.role, name: user.name };
  }
  const [user] = await db
    .insert(users)
    .values({ name: input.name?.trim() || "Leitor", email: input.email, role: "member" })
    .returning();
  await db.insert(identities).values({
    userId: user.id,
    provider: "guest",
    providerAccountId: input.sessionId,
    providerUsername: null,
  });
  return { userId: user.id, role: user.role, name: user.name };
}
