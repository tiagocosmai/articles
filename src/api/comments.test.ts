// @vitest-environment node
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { comments } from "../db/schema";
import { seedCatalog } from "../db/seedCatalog";
import { createTestDb } from "../db/testDb";
import { signInIdentity } from "../db/users";
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

it("keeps new comments pending until they are approved", async () => {
  const previous = process.env.COMMENTS_AUTO_APPROVE;
  process.env.COMMENTS_AUTO_APPROVE = "false";
  try {
  await pendingComments();
  } finally {
    if (previous === undefined) delete process.env.COMMENTS_AUTO_APPROVE;
    else process.env.COMMENTS_AUTO_APPROVE = previous;
  }
});

async function pendingComments() {
  const db = await createTestDb();
  await seedCatalog(db, content);
  const author = await signInIdentity(db, {
    provider: "linkedin",
    providerAccountId: "ln-1",
    providerUsername: null,
    name: "Ada",
    email: null,
    currentUserId: null,
  });
  const other = await signInIdentity(db, {
    provider: "github",
    providerAccountId: "44",
    providerUsername: "ada",
    name: "Grace",
    email: null,
    currentUserId: null,
  });
  const authorSession = { id: author.userId, role: author.role, name: author.name };
  const otherSession = { id: other.userId, role: other.role, name: other.name };

  expect((await postComment(db, "o-agente-secreto", null, { body: "Olá", parentId: null })).status).toBe(401);
  expect((await postComment(db, "o-agente-secreto", authorSession, { body: "   ", parentId: null })).status).toBe(400);
  expect((await postComment(db, "o-agente-secreto", authorSession, { body: "x".repeat(1001), parentId: null })).status).toBe(400);

  const created = await postComment(db, "o-agente-secreto", authorSession, { body: "Olá", parentId: null });
  expect(created.status).toBe(201);
  if (created.status !== 201) throw new Error("expected 201");
  expect(created.body).toMatchObject({ status: "pending", body: "Olá", parentId: null, userName: "Ada", mine: true });

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

  const reply = await postComment(db, "o-agente-secreto", authorSession, { body: "Resposta", parentId: created.body.id });
  expect(reply.status).toBe(201);
  if (reply.status !== 201) throw new Error("expected 201");
  expect((await postComment(db, "o-agente-secreto", authorSession, { body: "Resposta", parentId: randomUUID() })).status).toBe(400);
  expect((await postComment(db, "o-agente-secreto", authorSession, { body: "Segundo nível", parentId: reply.body.id })).status).toBe(400);

  expect((await deleteComment(db, "o-agente-secreto", authorSession, created.body.id)).status).toBe(200);
  const afterDelete = await getComments(db, "o-agente-secreto", null);
  if (afterDelete.status !== 200) throw new Error("expected comments");
  expect(afterDelete.body.comments).toHaveLength(0);
  expect((await deleteComment(db, "o-agente-secreto", otherSession, reply.body.id)).status).toBe(403);
}

it("publishes a plain-text comment when automatic approval is on", async () => {
  const previous = process.env.COMMENTS_AUTO_APPROVE;
  delete process.env.COMMENTS_AUTO_APPROVE;
  try {
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
  } finally {
    if (previous === undefined) delete process.env.COMMENTS_AUTO_APPROVE;
    else process.env.COMMENTS_AUTO_APPROVE = previous;
  }
});
