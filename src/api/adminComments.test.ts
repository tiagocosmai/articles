// @vitest-environment node
import { eq } from "drizzle-orm";
import { articles, comments } from "../db/schema";
import { seedCatalog } from "../db/seedCatalog";
import { createTestDb } from "../db/testDb";
import { signInIdentity } from "../db/users";
import type { LoadedContent } from "../types/content";
import { deleteAdminComment, listAdminComments, setCommentStatus } from "./adminComments";
import { postComment } from "./comments";

const content: LoadedContent = {
  errors: [],
  articles: [
    {
      slug: "o-agente-secreto",
      date: "2026-09-24",
      tags: [],
      locales: {
        pt: { title: "PT", description: "d", markdown: "o-agente-secreto.pt.md" },
        en: { title: "EN", description: "d", markdown: "o-agente-secreto.en.md" },
        es: { title: "ES", description: "d", markdown: "o-agente-secreto.es.md" },
      },
    },
    {
      slug: "outro",
      date: "2026-10-02",
      tags: [],
      locales: {
        pt: { title: "Outro", description: "d", markdown: "outro.pt.md" },
        en: { title: "Other", description: "d", markdown: "outro.en.md" },
        es: { title: "Otro", description: "d", markdown: "outro.es.md" },
      },
    },
  ],
  markdown: {
    "o-agente-secreto.pt.md": "corpo",
    "o-agente-secreto.en.md": "body",
    "o-agente-secreto.es.md": "cuerpo",
  },
  flashcards: {},
};

it("lets only an admin change status, filter, and delete a comment", async () => {
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
  expect((await setCommentStatus(db, null, created.body.id, "approved")).status).toBe(401);
  expect((await deleteAdminComment(db, null, created.body.id)).status).toBe(401);
  expect((await listAdminComments(db, memberSession)).status).toBe(403);
  expect((await setCommentStatus(db, memberSession, created.body.id, "approved")).status).toBe(403);
  expect((await setCommentStatus(db, adminSession, created.body.id, "nope")).status).toBe(400);
  expect((await setCommentStatus(db, adminSession, "00000000-0000-4000-8000-000000000000", "approved")).status).toBe(404);
  expect((await deleteAdminComment(db, adminSession, "00000000-0000-4000-8000-000000000000")).status).toBe(404);
  expect((await listAdminComments(db, adminSession, { status: "nope" })).status).toBe(400);

  await db.update(comments).set({ status: "pending" }).where(eq(comments.id, created.body.id));
  const listed = await listAdminComments(db, adminSession);
  expect(listed.status).toBe(200);
  if (listed.status !== 200) throw new Error("expected list");
  expect(listed.body.comments[0]).toMatchObject({
    id: created.body.id,
    articleSlug: "o-agente-secreto",
    articleTitle: "PT",
    authorName: "Ada",
    status: "pending",
    body: "Olá",
    parentId: null,
  });

  const [secret] = await db.select().from(articles).where(eq(articles.slug, "o-agente-secreto"));
  await db.insert(comments).values({
    articleId: secret.id,
    userId: member.userId,
    parentId: created.body.id,
    body: "resposta",
    status: "pending",
  });
  const withReply = await listAdminComments(db, adminSession);
  if (withReply.status !== 200) throw new Error("expected reply list");
  expect(withReply.body.comments.find((comment) => comment.body === "resposta")?.parentId).toBe(created.body.id);

  await setCommentStatus(db, adminSession, created.body.id, "approved");
  const same = await setCommentStatus(db, adminSession, created.body.id, "approved");
  expect(same.status).toBe(200);
  if (same.status !== 200) throw new Error("expected status");
  expect(same.body.comment.status).toBe("approved");

  await setCommentStatus(db, adminSession, created.body.id, "rejected");
  await setCommentStatus(db, adminSession, created.body.id, "pending");

  const [other] = await db.select().from(articles).where(eq(articles.slug, "outro"));
  await db.insert(comments).values({
    articleId: other.id,
    userId: member.userId,
    body: "lá",
    status: "approved",
    createdAt: new Date("2026-10-05T12:00:00Z"),
  });
  const filtered = await listAdminComments(db, adminSession, { status: "approved", article: "outro" });
  expect(filtered.status).toBe(200);
  if (filtered.status !== 200) throw new Error("expected filter");
  expect(filtered.body.comments.map((comment) => comment.body)).toEqual(["lá"]);

  const missing = await listAdminComments(db, adminSession, { article: "nao-existe" });
  expect(missing.status).toBe(200);
  if (missing.status !== 200) throw new Error("expected empty");
  expect(missing.body.comments).toEqual([]);

  expect((await deleteAdminComment(db, adminSession, created.body.id)).status).toBe(200);
  const afterDelete = await listAdminComments(db, adminSession);
  if (afterDelete.status !== 200) throw new Error("expected list");
  expect(afterDelete.body.comments.map((comment) => comment.id)).not.toContain(created.body.id);
  expect((await deleteAdminComment(db, adminSession, created.body.id)).status).toBe(404);
});
