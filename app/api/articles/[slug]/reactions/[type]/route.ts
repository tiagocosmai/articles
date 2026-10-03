import { auth } from "../../../../../../src/auth";
import { deleteReaction, type ReaderSession } from "../../../../../../src/api/reactions";
import { getDb } from "../../../../../../src/db/client";

export const runtime = "nodejs";

async function reader(): Promise<ReaderSession> {
  const session = await auth();
  if (!session?.userId || (session.role !== "admin" && session.role !== "member")) return null;
  return { id: session.userId, role: session.role, name: session.user?.name ?? "" };
}

export async function DELETE(_request: Request, context: { params: Promise<{ slug: string; type: string }> }) {
  const { slug, type } = await context.params;
  const result = await deleteReaction(getDb(), slug, await reader(), type);
  return Response.json(result.body, { status: result.status });
}
