// @vitest-environment node
import { eq } from "drizzle-orm";
import { articles, comments, identities, reactions, users } from "./schema";
import { signInGuest, signInIdentity } from "./users";
import { createTestDb } from "./testDb";

const github = {
  provider: "github" as const,
  providerAccountId: "1",
  providerUsername: "tiagocosmai",
  name: "Tiago",
  email: "tiagocosmai@gmail.com",
  currentUserId: null,
};

it("makes tiagocosmai an admin and links LinkedIn onto that user", async () => {
  const db = await createTestDb();
  const first = await signInIdentity(db, github);
  expect(first.role).toBe("admin");
  const renamed = await signInIdentity(db, { ...github, name: "Tiago Cosmai" });
  expect(renamed).toMatchObject({ userId: first.userId, name: "Tiago Cosmai", role: "admin" });
  const linked = await signInIdentity(db, {
    provider: "linkedin",
    providerAccountId: "ln-9",
    providerUsername: null,
    name: "Tiago Cosmai",
    email: "tiagocosmai@gmail.com",
    currentUserId: first.userId,
  });
  expect(linked.userId).toBe(first.userId);
});

it("does not attach the tiagocosmai GitHub login onto another member", async () => {
  const db = await createTestDb();
  const member = await signInIdentity(db, {
    provider: "linkedin",
    providerAccountId: "ln-1",
    providerUsername: null,
    name: "Ada",
    email: null,
    currentUserId: null,
  });
  const admin = await signInIdentity(db, {
    provider: "github",
    providerAccountId: "44",
    providerUsername: "tiagocosmai",
    name: "Tiago",
    email: null,
    currentUserId: member.userId,
  });
  expect(admin.role).toBe("admin");
  expect(admin.userId).not.toBe(member.userId);
  const again = await signInIdentity(db, { ...github, providerAccountId: "2" });
  expect(again.userId).toBe(admin.userId);
});

it("still links a non-admin GitHub account onto the current member", async () => {
  const db = await createTestDb();
  const member = await signInIdentity(db, {
    provider: "linkedin",
    providerAccountId: "ln-2",
    providerUsername: null,
    name: "Ada",
    email: null,
    currentUserId: null,
  });
  const linked = await signInIdentity(db, {
    provider: "github",
    providerAccountId: "88",
    providerUsername: "ada",
    name: "Ada",
    email: null,
    currentUserId: member.userId,
  });
  expect(linked).toMatchObject({ userId: member.userId, role: "member" });
});

it("attaches the admin Gmail onto the GitHub admin", async () => {
  const db = await createTestDb();
  const admin = await signInIdentity(db, github);
  const gmail = await signInIdentity(db, {
    provider: "gmail",
    providerAccountId: "google-1",
    providerUsername: null,
    name: "Tiago Cosmai",
    email: "  TiagoCosmai@Gmail.com ",
    currentUserId: null,
  });
  expect(gmail).toMatchObject({ userId: admin.userId, role: "admin", name: "Tiago Cosmai" });
});

it("creates the admin from Gmail and attaches GitHub afterwards", async () => {
  const db = await createTestDb();
  const gmail = await signInIdentity(db, {
    provider: "gmail",
    providerAccountId: "google-1",
    providerUsername: null,
    name: "Tiago",
    email: "tiagocosmai@gmail.com",
    currentUserId: null,
  });
  expect(gmail.role).toBe("admin");
  const githubLogin = await signInIdentity(db, { ...github, currentUserId: null });
  expect(githubLogin.userId).toBe(gmail.userId);
});

it("keeps another Gmail address as a member", async () => {
  const db = await createTestDb();
  const other = await signInIdentity(db, {
    provider: "gmail",
    providerAccountId: "google-2",
    providerUsername: null,
    name: "Ada",
    email: "ada@example.com",
    currentUserId: null,
  });
  expect(other.role).toBe("member");
});

it("merges a pre-existing admin Gmail user into the GitHub admin", async () => {
  const db = await createTestDb();
  const admin = await signInIdentity(db, github);
  const [duplicate] = await db.insert(users).values({ name: "Old", email: "tiagocosmai@gmail.com", role: "member" }).returning();
  const [article] = await db.insert(articles).values({ slug: "nota", publishedOn: "2026-10-01" }).returning();
  await db.insert(identities).values({
    userId: duplicate.id,
    provider: "gmail",
    providerAccountId: "google-old",
    providerUsername: null,
  });
  const [comment] = await db.insert(comments).values({
    articleId: article.id,
    userId: duplicate.id,
    body: "oi",
    status: "pending",
  }).returning();
  const [reaction] = await db.insert(reactions).values({
    articleId: article.id,
    userId: duplicate.id,
    type: "like",
  }).returning();

  const signedIn = await signInIdentity(db, {
    provider: "gmail",
    providerAccountId: "google-old",
    providerUsername: null,
    name: "Tiago",
    email: "tiagocosmai@gmail.com",
    currentUserId: null,
  });

  expect(signedIn.userId).toBe(admin.userId);
  const [movedComment] = await db.select().from(comments).where(eq(comments.id, comment.id));
  const [movedReaction] = await db.select().from(reactions).where(eq(reactions.id, reaction.id));
  const [gone] = await db.select().from(users).where(eq(users.id, duplicate.id));
  expect(movedComment.userId).toBe(admin.userId);
  expect(movedReaction.userId).toBe(admin.userId);
  expect(gone.deletedAt).toBeInstanceOf(Date);
});

it("keeps a guest separate from a GitHub user who uses the same email", async () => {
  const db = await createTestDb();
  const account = await signInIdentity(db, {
    ...github,
    providerAccountId: "9",
    providerUsername: "ada",
    email: "ada@example.com",
  });
  const guest = await signInGuest(db, { name: "Ada Lovelace", email: "Ada@Example.com" });
  expect(guest.role).toBe("member");
  expect(guest.userId).not.toBe(account.userId);
  const again = await signInGuest(db, { name: "Ada L.", email: "ada@example.com" });
  expect(again).toMatchObject({ userId: guest.userId, name: "Ada L.", role: "member" });
});
