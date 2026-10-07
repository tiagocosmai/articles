import { auth } from "../../../../src/auth";
import { createAdminPost, listAdminPosts } from "../../../../src/api/adminPosts";
import type { ReaderSession } from "../../../../src/api/reactions";
import { getDb } from "../../../../src/db/client";

export const runtime = "nodejs";

async function reader(): Promise<ReaderSession> {
  const session = await auth();
  if (!session?.userId || (session.role !== "admin" && session.role !== "member")) return null;
  return { id: session.userId, role: session.role, name: session.user?.name ?? "" };
}

export async function GET() {
  const result = await listAdminPosts(getDb(), await reader());
  return Response.json(result.body, { status: result.status });
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const result = await createAdminPost(getDb(), await reader(), payload);
  return Response.json(result.body, { status: result.status });
}
