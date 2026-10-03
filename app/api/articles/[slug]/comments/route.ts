import { getComments, postComment } from "../../../../../src/api/comments";
import type { ReaderSession } from "../../../../../src/api/reactions";
import { readSessionId } from "../../../../../src/auth/visitor";
import { getDb } from "../../../../../src/db/client";
import { findVisitor } from "../../../../../src/db/users";

export const runtime = "nodejs";

async function reader(request: Request): Promise<ReaderSession> {
  const sessionId = readSessionId(request.headers.get("cookie"));
  if (!sessionId) return null;
  const visitor = await findVisitor(getDb(), sessionId);
  if (!visitor) return null;
  return { id: visitor.userId, role: visitor.role, name: visitor.name };
}

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const result = await getComments(getDb(), slug, await reader(request));
  return Response.json(result.body, { status: result.status });
}

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const body = (await request.json()) as { body?: string; parentId?: string | null; name?: string; email?: string };
  const result = await postComment(getDb(), slug, {
    body: body.body ?? "",
    parentId: body.parentId ?? null,
    sessionId: readSessionId(request.headers.get("cookie")) ?? undefined,
    name: body.name,
    email: body.email,
  });
  return Response.json(result.body, { status: result.status });
}
