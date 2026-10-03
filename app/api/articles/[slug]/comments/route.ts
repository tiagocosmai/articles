import { auth } from "../../../../../src/auth";
import { getComments, postComment } from "../../../../../src/api/comments";
import type { ReaderSession } from "../../../../../src/api/reactions";
import { getDb } from "../../../../../src/db/client";

export const runtime = "nodejs";

async function reader(): Promise<ReaderSession> {
  const session = await auth();
  if (!session?.userId || (session.role !== "admin" && session.role !== "member")) return null;
  return { id: session.userId, role: session.role, name: session.user?.name ?? "" };
}

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const result = await getComments(getDb(), slug, await reader());
  return Response.json(result.body, { status: result.status });
}

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const body = (await request.json()) as { body?: string; parentId?: string | null; name?: string; email?: string };
  const result = await postComment(getDb(), slug, await reader(), {
    body: body.body ?? "",
    parentId: body.parentId ?? null,
    name: body.name,
    email: body.email,
  });
  return Response.json(result.body, { status: result.status });
}
