import { and, eq, isNull, sql } from "drizzle-orm";
import type { GuestContact } from "../auth/guest";
import { comments, identities, reactions, users } from "./schema";
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

const adminEmail = "tiagocosmai@gmail.com";

export function isAdminLogin(input: Pick<IdentityInput, "provider" | "providerUsername" | "email">): boolean {
  if (input.provider === "github" && input.providerUsername === "tiagocosmai") return true;
  return input.provider === "gmail" && input.email?.trim().toLowerCase() === adminEmail;
}

async function findGithubAdmin(db: TestDatabase) {
  const [row] = await db
    .select({ id: users.id })
    .from(identities)
    .innerJoin(users, eq(users.id, identities.userId))
    .where(and(eq(identities.provider, "github"), eq(identities.providerUsername, "tiagocosmai"), isNull(users.deletedAt)));
  return row ?? null;
}

async function findGmailAdmin(db: TestDatabase) {
  const [row] = await db
    .select({ id: users.id })
    .from(identities)
    .innerJoin(users, eq(users.id, identities.userId))
    .where(and(eq(identities.provider, "gmail"), sql`lower(trim(${users.email})) = ${adminEmail}`, isNull(users.deletedAt)));
  return row ?? null;
}

async function promote(db: TestDatabase, userId: string, name: string) {
  const [user] = await db
    .update(users)
    .set({ name, role: "admin", updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return { userId: user.id, role: user.role, name: user.name };
}

async function moveReactions(db: TestDatabase, fromId: string, toId: string) {
  const rows = await db.select().from(reactions).where(eq(reactions.userId, fromId));
  for (const reaction of rows) {
    if (reaction.deletedAt) {
      await db.update(reactions).set({ userId: toId }).where(eq(reactions.id, reaction.id));
      continue;
    }
    const [clash] = await db
      .select({ id: reactions.id })
      .from(reactions)
      .where(
        and(
          eq(reactions.userId, toId),
          eq(reactions.articleId, reaction.articleId),
          eq(reactions.type, reaction.type),
          isNull(reactions.deletedAt),
        ),
      );
    if (clash) {
      await db.update(reactions).set({ deletedAt: new Date() }).where(eq(reactions.id, reaction.id));
    } else {
      await db.update(reactions).set({ userId: toId }).where(eq(reactions.id, reaction.id));
    }
  }
}

async function mergeUserInto(db: TestDatabase, fromId: string, toId: string) {
  await db.update(comments).set({ userId: toId, updatedAt: new Date() }).where(eq(comments.userId, fromId));
  await moveReactions(db, fromId, toId);
  await db.update(identities).set({ userId: toId }).where(eq(identities.userId, fromId));
  await db.update(users).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, fromId));
}

export async function signInIdentity(db: TestDatabase, input: IdentityInput) {
  const adminLogin = isAdminLogin(input);
  const [existing] = await db
    .select()
    .from(identities)
    .where(and(eq(identities.provider, input.provider), eq(identities.providerAccountId, input.providerAccountId)));

  if (existing && adminLogin && input.provider === "gmail") {
    const githubAdmin = await findGithubAdmin(db);
    if (githubAdmin && githubAdmin.id !== existing.userId) {
      await mergeUserInto(db, existing.userId, githubAdmin.id);
      return promote(db, githubAdmin.id, input.name);
    }
  }

  if (existing) {
    const [user] = await db
      .update(users)
      .set({ name: input.name, ...(adminLogin ? { role: "admin" as const } : {}), updatedAt: new Date() })
      .where(eq(users.id, existing.userId))
      .returning();
    return { userId: user.id, role: user.role, name: user.name };
  }

  if (adminLogin) {
    const canonical = (await findGithubAdmin(db)) ?? (await findGmailAdmin(db));
    if (canonical) {
      const [sameProvider] = await db
        .select()
        .from(identities)
        .where(and(eq(identities.userId, canonical.id), eq(identities.provider, input.provider)));
      if (sameProvider) {
        await db
          .update(identities)
          .set({ providerAccountId: input.providerAccountId, providerUsername: input.providerUsername })
          .where(eq(identities.id, sameProvider.id));
      } else {
        await db.insert(identities).values({
          userId: canonical.id,
          provider: input.provider,
          providerAccountId: input.providerAccountId,
          providerUsername: input.providerUsername,
        });
      }
      return promote(db, canonical.id, input.name);
    }
    const [user] = await db.insert(users).values({ name: input.name, email: input.email, role: "admin" }).returning();
    await db.insert(identities).values({
      userId: user.id,
      provider: input.provider,
      providerAccountId: input.providerAccountId,
      providerUsername: input.providerUsername,
    });
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

  const [user] = await db.insert(users).values({ name: input.name, email: input.email, role: "member" }).returning();
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
