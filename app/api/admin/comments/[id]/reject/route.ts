import { auth } from "../../../../../../src/auth";
import { rejectComment } from "../../../../../../src/api/adminComments";
import type { ReaderSession } from "../../../../../../src/api/reactions";
import { getDb } from "../../../../../../src/db/client";

export const runtime = "nodejs";

async function reader(): Promise<ReaderSession> {
  const session = await auth();
  if (!session?.userId || (session.role !== "admin" && session.role !== "member")) return null;
  return { id: session.userId, role: session.role, name: session.user?.name ?? "" };
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const result = await rejectComment(getDb(), await reader(), id);
  return Response.json(result.body, { status: result.status });
}
