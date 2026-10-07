import { auth } from "../../../../../src/auth";
import { updateAdminPost } from "../../../../../src/api/adminPosts";
import type { ReaderSession } from "../../../../../src/api/reactions";
import { getDb } from "../../../../../src/db/client";

export const runtime = "nodejs";

async function reader(): Promise<ReaderSession> {
  const session = await auth();
  if (!session?.userId || (session.role !== "admin" && session.role !== "member")) return null;
  return { id: session.userId, role: session.role, name: session.user?.name ?? "" };
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const payload = await request.json().catch(() => null);
  const result = await updateAdminPost(getDb(), await reader(), id, payload);
  return Response.json(result.body, { status: result.status });
}
