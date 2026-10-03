// @vitest-environment node
import { articlesAuthAdapter } from "./adapter";
import { createTestDb } from "../db/testDb";
import { signInIdentity } from "../db/users";

it("stores a magic-link token once and finds the Auth.js account on our user", async () => {
  const db = await createTestDb();
  const adapter = articlesAuthAdapter(db);
  const expires = new Date("2026-10-04T00:00:00.000Z");
  await adapter.createVerificationToken?.({ identifier: "ada@example.com", token: "hashed", expires });
  const used = await adapter.useVerificationToken?.({ identifier: "ada@example.com", token: "hashed" });
  expect(used).toMatchObject({ identifier: "ada@example.com", token: "hashed" });
  expect(await adapter.useVerificationToken?.({ identifier: "ada@example.com", token: "hashed" })).toBeNull();

  const signedIn = await signInIdentity(db, {
    provider: "gmail",
    providerAccountId: "google-1",
    providerUsername: null,
    name: "Ada",
    email: "ada@example.com",
    currentUserId: null,
  });
  const found = await adapter.getUserByAccount?.({ provider: "google", providerAccountId: "google-1" });
  expect(found?.id).toBe(signedIn.userId);
  expect(await adapter.getUserByEmail?.("ada@example.com")).toBeNull();
});
