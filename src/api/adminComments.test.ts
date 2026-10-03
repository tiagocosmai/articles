// @vitest-environment node
import { eq } from "drizzle-orm";
import { comments } from "../db/schema";
import { seedCatalog } from "../db/seedCatalog";
import { createTestDb } from "../db/testDb";
import { signInIdentity } from "../db/users";
import type { LoadedContent } from "../types/content";
import { postComment } from "./comments";
import { approveComment, listAdminComments, rejectComment } from "./adminComments";

const content: LoadedContent = {
  errors: [],
  articles: [{
    slug: "o-agente-secreto",
    date: "2026-09-24",
    tags: [],
    locales: {
      pt: { title: "PT", description: "d", markdown: "o-agente-secreto.pt.md" },
      en: { title: "EN", description: "d", markdown: "o-agente-secreto.en.md" },
      es: { title: "ES", description: "d", markdown: "o-agente-secreto.es.md" },
    },
  }],
  markdown: {
    "o-agente-secreto.pt.md": "corpo",
    "o-agente-secreto.en.md": "body",
    "o-agente-secreto.es.md": "cuerpo",
  },
  flashcards: {},
};

it("lets only an admin approve or reject a comment", async () => {
  const db = await createTestDb();
  await seedCatalog(db, content);
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
    providerAccountId: "1",
    providerUsername: "tiagocosmai",
    name: "Tiago",
    email: null,
    currentUserId: null,
  });
  const memberSession = { id: member.userId, role: member.role, name: member.name };
  const adminSession = { id: admin.userId, role: admin.role, name: admin.name };
  const created = await postComment(db, "o-agente-secreto", {
    body: "Olá",
    parentId: null,
    sessionId: "6f4b1c0a-6a4e-4b1d-8c3e-1a2b3c4d5e6f",
    name: "Ada",
    email: "ada@example.com",
  });
  expect(created.status).toBe(201);
  if (created.status !== 201) throw new Error("expected 201");

  expect((await listAdminComments(db, null)).status).toBe(401);
  expect((await approveComment(db, null, created.body.id)).status).toBe(401);
  expect((await rejectComment(db, null, created.body.id)).status).toBe(401);
  expect((await listAdminComments(db, memberSession)).status).toBe(403);
  expect((await approveComment(db, memberSession, created.body.id)).status).toBe(403);
  expect((await rejectComment(db, memberSession, created.body.id)).status).toBe(403);

  const listed = await listAdminComments(db, adminSession);
  expect(listed.status).toBe(200);
  if (listed.status !== 200) throw new Error("expected list");
  expect(listed.body.comments.map((comment) => comment.id)).toContain(created.body.id);

  await db.update(comments).set({ updatedAt: new Date("2020-01-01T00:00:00Z") }).where(eq(comments.id, created.body.id));
  expect((await approveComment(db, adminSession, created.body.id)).status).toBe(200);
  const [approved] = await db.select().from(comments).where(eq(comments.id, created.body.id));
  expect(approved.status).toBe("approved");
  expect(approved.updatedAt.getTime()).toBeGreaterThan(new Date("2020-01-01T00:00:00Z").getTime());

  expect((await rejectComment(db, adminSession, created.body.id)).status).toBe(200);
  const [rejected] = await db.select().from(comments).where(eq(comments.id, created.body.id));
  expect(rejected.status).toBe("rejected");

  await db.update(comments).set({ deletedAt: new Date() }).where(eq(comments.id, created.body.id));
  const afterDelete = await listAdminComments(db, adminSession);
  if (afterDelete.status !== 200) throw new Error("expected list");
  expect(afterDelete.body.comments.map((comment) => comment.id)).not.toContain(created.body.id);
});
