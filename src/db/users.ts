import { and, eq } from "drizzle-orm";
import { identities, users } from "./schema";
import type { TestDatabase } from "./testDb";

export type IdentityInput = {
  provider: "github" | "linkedin";
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
