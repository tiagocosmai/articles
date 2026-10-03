// @vitest-environment node
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

it("keeps a LinkedIn member when a later GitHub login is linked", async () => {
  const db = await createTestDb();
  const member = await signInIdentity(db, {
    provider: "linkedin",
    providerAccountId: "ln-1",
    providerUsername: null,
    name: "Ada",
    email: null,
    currentUserId: null,
  });
  expect(member.role).toBe("member");
  const linked = await signInIdentity(db, {
    provider: "github",
    providerAccountId: "44",
    providerUsername: "tiagocosmai",
    name: "Ada",
    email: null,
    currentUserId: member.userId,
  });
  expect(linked).toMatchObject({ userId: member.userId, role: "member" });
  const admin = await signInIdentity(db, { ...github, providerAccountId: "2" });
  expect(admin.role).toBe("admin");
  expect(admin.userId).not.toBe(member.userId);
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
