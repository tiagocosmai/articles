// @vitest-environment node
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { comments } from "../db/schema";
import { seedCatalog } from "../db/seedCatalog";
import { createTestDb } from "../db/testDb";
import { signInGuest, signInIdentity } from "../db/users";
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

it("holds a name-and-email comment for moderation and publishes a signed-in comment", async () => {
  const db = await createTestDb();
  await seedCatalog(db, content);
  const author = await signInGuest(db, { name: "Ada", email: "ada@example.com" });
  const other = await signInIdentity(db, {
    provider: "github",
    providerAccountId: "44",
    providerUsername: "ada",
    name: "Grace",
    email: "ada@example.com",
    currentUserId: null,
  });
  const authorSession = { id: author.userId, role: author.role, name: author.name };
  const otherSession = { id: other.userId, role: other.role, name: other.name };

  expect((await postComment(db, "o-agente-secreto", null, { body: "Olá", parentId: null })).status).toBe(401);
  expect((await postComment(db, "o-agente-secreto", null, { body: "Olá", parentId: null, name: "Ada", email: "not-an-email" })).status).toBe(400);
  expect((await postComment(db, "o-agente-secreto", otherSession, { body: "   ", parentId: null })).status).toBe(400);
  expect((await postComment(db, "o-agente-secreto", otherSession, { body: "x".repeat(1001), parentId: null })).status).toBe(400);

  const signedIn = await postComment(db, "o-agente-secreto", otherSession, { body: "Entrei", parentId: null });
  expect(signedIn.status).toBe(201);
  if (signedIn.status !== 201) throw new Error("expected 201");
  expect(signedIn.body).toMatchObject({ status: "approved", userName: "Grace" });
  expect(other.userId).not.toBe(author.userId);
  expect((await deleteComment(db, "o-agente-secreto", otherSession, signedIn.body.id)).status).toBe(200);

  const created = await postComment(db, "o-agente-secreto", null, {
    body: "Olá",
    parentId: null,
    name: "Ada",
    email: "ada@example.com",
  });
  expect(created.status).toBe(201);
  if (created.status !== 201) throw new Error("expected 201");
  expect(created.body).toMatchObject({ status: "pending", body: "Olá", parentId: null, userName: "Ada", mine: true });
  expect(created.body.id).not.toBe(signedIn.body.id);

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

  const reply = await postComment(db, "o-agente-secreto", null, {
    body: "Resposta",
    parentId: created.body.id,
    name: "Ada",
    email: "ada@example.com",
  });
  expect(reply.status).toBe(201);
  if (reply.status !== 201) throw new Error("expected 201");
  expect((await postComment(db, "o-agente-secreto", authorSession, { body: "Resposta", parentId: randomUUID() })).status).toBe(400);
  expect((await postComment(db, "o-agente-secreto", authorSession, { body: "Segundo nível", parentId: reply.body.id })).status).toBe(400);

  expect((await deleteComment(db, "o-agente-secreto", authorSession, created.body.id)).status).toBe(200);
  const afterDelete = await getComments(db, "o-agente-secreto", null);
  if (afterDelete.status !== 200) throw new Error("expected comments");
  expect(afterDelete.body.comments).toHaveLength(0);
  expect((await deleteComment(db, "o-agente-secreto", otherSession, reply.body.id)).status).toBe(403);
});

it("stores a signed-in comment as plain text", async () => {
  const db = await createTestDb();
  await seedCatalog(db, content);
  const author = await signInIdentity(db, {
    provider: "github",
    providerAccountId: "7",
    providerUsername: "ada",
    name: "Ada",
    email: null,
    currentUserId: null,
  });
  const session = { id: author.userId, role: author.role, name: author.name };
  const body = "'); DROP TABLE comments;--";
  const created = await postComment(db, "o-agente-secreto", session, { body, parentId: null });
  expect(created.status).toBe(201);
  if (created.status !== 201) throw new Error("expected 201");
  expect(created.body).toMatchObject({ status: "approved", body });
  const listed = await getComments(db, "o-agente-secreto", null);
  if (listed.status !== 200) throw new Error("expected comments");
  expect(listed.body.comments).toHaveLength(1);
  expect(listed.body.comments[0].body).toBe(body);
});
