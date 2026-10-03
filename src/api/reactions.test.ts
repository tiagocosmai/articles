// @vitest-environment node
import { seedCatalog } from "../db/seedCatalog";
import { createTestDb } from "../db/testDb";
import { signInVisitor } from "../db/users";
import type { LoadedContent } from "../types/content";
import { deleteReaction, getReactions, postReaction } from "./reactions";

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

const types = ["like", "celebrate", "support", "love", "insightful", "funny"];

function count(
  body: { reactions?: { type: string; count: number; mine: boolean }[] },
  type: string,
) {
  const match = body.reactions?.find((reaction) => reaction.type === type);
  if (!match) throw new Error(`missing ${type}`);
  return match;
}

it("stores one active reaction of each type and restores it after delete", async () => {
  const db = await createTestDb();
  await seedCatalog(db, content);
  const sessionId = "6f4b1c0a-6a4e-4b1d-8c3e-1a2b3c4d5e6f";
  const member = await signInVisitor(db, { sessionId, name: null, email: null });
  const session = { id: member.userId, role: member.role, name: member.name };

  const anonymous = await getReactions(db, "o-agente-secreto", null);
  expect(anonymous.status).toBe(200);
  if (anonymous.status !== 200) throw new Error("expected reactions");
  expect(anonymous.body.reactions.map((reaction) => reaction.type)).toEqual(types);
  expect(anonymous.body.reactions.every((reaction) => reaction.count === 0 && reaction.mine === false)).toBe(true);

  expect((await postReaction(db, "o-agente-secreto", null, "like")).status).toBe(401);

  expect((await postReaction(db, "o-agente-secreto", sessionId, "like")).status).toBe(200);
  const liked = await getReactions(db, "o-agente-secreto", session);
  expect(count(liked.body, "like")).toMatchObject({ count: 1, mine: true });

  expect((await postReaction(db, "o-agente-secreto", sessionId, "like")).status).toBe(200);
  expect(count((await getReactions(db, "o-agente-secreto", session)).body, "like")?.count).toBe(1);

  expect((await postReaction(db, "o-agente-secreto", sessionId, "love")).status).toBe(200);
  const both = await getReactions(db, "o-agente-secreto", session);
  expect(count(both.body, "love")).toMatchObject({ count: 1, mine: true });
  expect(count(both.body, "like")?.count).toBe(1);

  expect((await deleteReaction(db, "o-agente-secreto", sessionId, "like")).status).toBe(200);
  expect(count((await getReactions(db, "o-agente-secreto", session)).body, "like")?.count).toBe(0);

  expect((await postReaction(db, "o-agente-secreto", sessionId, "like")).status).toBe(200);
  expect(count((await getReactions(db, "o-agente-secreto", session)).body, "like")?.count).toBe(1);

  expect((await postReaction(db, "o-agente-secreto", sessionId, "nope")).status).toBe(400);
  expect((await postReaction(db, "ausente", sessionId, "like")).status).toBe(404);

  const otherId = "7f4b1c0a-6a4e-4b1d-8c3e-1a2b3c4d5e6f";
  expect((await postReaction(db, "o-agente-secreto", otherId, "celebrate")).status).toBe(200);
  const other = await signInVisitor(db, { sessionId: otherId, name: null, email: null });
  expect(other.userId).not.toBe(member.userId);
  const visible = await getReactions(db, "o-agente-secreto", null);
  expect(count(visible.body, "celebrate")?.count).toBe(1);
});
