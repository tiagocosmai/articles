import { getReactions, postReaction, type ReaderSession } from "../../../../../src/api/reactions";
import { sessionIdFrom } from "../../../../../src/auth/visitor";
import { getDb } from "../../../../../src/db/client";
import { findVisitor } from "../../../../../src/db/users";

export const runtime = "nodejs";

async function reader(request: Request): Promise<ReaderSession> {
  const sessionId = sessionIdFrom(request);
  if (!sessionId) return null;
  const visitor = await findVisitor(getDb(), sessionId);
  if (!visitor) return null;
  return { id: visitor.userId, role: visitor.role, name: visitor.name };
}

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const result = await getReactions(getDb(), slug, await reader(request));
  return Response.json(result.body, { status: result.status });
}

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const body = (await request.json()) as { type?: string; sessionId?: string };
  const result = await postReaction(getDb(), slug, sessionIdFrom(request, body.sessionId), body.type ?? "");
  return Response.json(result.body, { status: result.status });
}
