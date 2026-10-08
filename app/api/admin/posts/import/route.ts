import { auth } from "../../../../../src/auth";
import { importEditorialMarkdown } from "../../../../../src/api/adminPostImport";
import type { ReaderSession } from "../../../../../src/api/reactions";
import { getDb } from "../../../../../src/db/client";

export const runtime = "nodejs";

async function reader(): Promise<ReaderSession> {
  const session = await auth();
  if (!session?.userId || (session.role !== "admin" && session.role !== "member")) return null;
  return { id: session.userId, role: session.role, name: session.user?.name ?? "" };
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const result = await importEditorialMarkdown(getDb(), await reader(), payload);
  return Response.json(result.body, { status: result.status });
}
