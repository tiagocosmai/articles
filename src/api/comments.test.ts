// @vitest-environment node
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { comments } from "../db/schema";
import { seedCatalog } from "../db/seedCatalog";
import { createTestDb } from "../db/testDb";
import { findVisitor, signInIdentity } from "../db/users";
import type { LoadedContent } from "../types/content";
import { deleteComment, getComments, postComment } from "./comments";

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

const sessionId = "6f4b1c0a-6a4e-4b1d-8c3e-1a2b3c4d5e6f";
const contact = { sessionId, name: "Ada", email: "ada@example.com" };

it("holds every name-and-email comment for moderation", async () => {
  const db = await createTestDb();
  await seedCatalog(db, content);
  const other = await signInIdentity(db, {
    provider: "github",
    providerAccountId: "44",
    providerUsername: "ada",
    name: "Grace",
    email: "ada@example.com",
    currentUserId: null,
  });
  const otherSession = { id: other.userId, role: other.role, name: other.name };

  expect((await postComment(db, "o-agente-secreto", { body: "Olá", parentId: null })).status).toBe(401);
  expect((await postComment(db, "o-agente-secreto", { ...contact, body: "Olá", parentId: null, email: "not-an-email" })).status).toBe(400);
  expect((await postComment(db, "o-agente-secreto", { ...contact, body: "   ", parentId: null })).status).toBe(400);
  expect((await postComment(db, "o-agente-secreto", { ...contact, body: "x".repeat(1001), parentId: null })).status).toBe(400);

  const created = await postComment(db, "o-agente-secreto", { ...contact, body: "Olá", parentId: null });
  expect(created.status).toBe(201);
  if (created.status !== 201) throw new Error("expected 201");
  expect(created.body).toMatchObject({ status: "pending", body: "Olá", parentId: null, userName: "Ada", mine: true });
  const author = await findVisitor(db, sessionId);
  if (!author) throw new Error("expected visitor");
  expect(author.userId).not.toBe(other.userId);
  const authorSession = { id: author.userId, role: author.role, name: author.name };

  expect(await getComments(db, "o-agente-secreto", null)).toEqual({ status: 200, body: { comments: [] } });
  const own = await getComments(db, "o-agente-secreto", authorSession);
  if (own.status !== 200) throw new Error("expected comments");
  expect(own.body.comments).toHaveLength(1);
  expect(own.body.comments[0]).toMatchObject({ status: "pending", mine: true });
  const otherList = await getComments(db, "o-agente-secreto", otherSession);
  if (otherList.status !== 200) throw new Error("expected comments");
  expect(otherList.body.comments).toHaveLength(0);

  await db.update(comments).set({ status: "approved" }).where(eq(comments.id, created.body.id));
  const publicList = await getComments(db, "o-agente-secreto", null);
  if (publicList.status !== 200) throw new Error("expected comments");
  expect(publicList.body.comments).toHaveLength(1);
  expect(publicList.body.comments[0]).toMatchObject({ status: "approved", mine: false });

  const reply = await postComment(db, "o-agente-secreto", { ...contact, body: "Resposta", parentId: created.body.id });
  expect(reply.status).toBe(201);
  if (reply.status !== 201) throw new Error("expected 201");
  expect(reply.body).toMatchObject({ status: "pending" });
  expect((await postComment(db, "o-agente-secreto", { ...contact, body: "Resposta", parentId: randomUUID() })).status).toBe(400);
  expect((await postComment(db, "o-agente-secreto", { ...contact, body: "Segundo nível", parentId: reply.body.id })).status).toBe(400);

  expect((await deleteComment(db, "o-agente-secreto", authorSession, created.body.id)).status).toBe(200);
  const afterDelete = await getComments(db, "o-agente-secreto", null);
  if (afterDelete.status !== 200) throw new Error("expected comments");
  expect(afterDelete.body.comments).toHaveLength(0);
  expect((await deleteComment(db, "o-agente-secreto", otherSession, reply.body.id)).status).toBe(403);
});

it("stores a comment as plain text and keeps it pending", async () => {
  const db = await createTestDb();
  await seedCatalog(db, content);
  const body = "'); DROP TABLE comments;--";
  const created = await postComment(db, "o-agente-secreto", { ...contact, body, parentId: null });
  expect(created.status).toBe(201);
  if (created.status !== 201) throw new Error("expected 201");
  expect(created.body).toMatchObject({ status: "pending", body });
  const listed = await getComments(db, "o-agente-secreto", null);
  if (listed.status !== 200) throw new Error("expected comments");
  expect(listed.body.comments).toHaveLength(0);
});
