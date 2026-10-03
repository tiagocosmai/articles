import { auth } from "../../../../../src/auth";
import { getReactions, postReaction, type ReaderSession } from "../../../../../src/api/reactions";
import { getDb } from "../../../../../src/db/client";

export const runtime = "nodejs";

async function reader(): Promise<ReaderSession> {
  const session = await auth();
  if (!session?.userId || (session.role !== "admin" && session.role !== "member")) return null;
  return { id: session.userId, role: session.role, name: session.user?.name ?? "" };
}

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const result = await getReactions(getDb(), slug, await reader());
  return Response.json(result.body, { status: result.status });
}

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const body = (await request.json()) as { type?: string; name?: string; email?: string };
  const result = await postReaction(getDb(), slug, await reader(), body.type ?? "", {
    name: body.name,
    email: body.email,
  });
  return Response.json(result.body, { status: result.status });
}
