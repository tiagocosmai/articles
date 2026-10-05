import { auth } from "../../../../src/auth";
import { listAdminComments } from "../../../../src/api/adminComments";
import type { ReaderSession } from "../../../../src/api/reactions";
import { getDb } from "../../../../src/db/client";

export const runtime = "nodejs";

async function reader(): Promise<ReaderSession> {
  const session = await auth();
  if (!session?.userId || (session.role !== "admin" && session.role !== "member")) return null;
  return { id: session.userId, role: session.role, name: session.user?.name ?? "" };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const result = await listAdminComments(getDb(), await reader(), {
    status: url.searchParams.get("status") ?? undefined,
    article: url.searchParams.get("article") ?? undefined,
  });
  return Response.json(result.body, { status: result.status });
}
