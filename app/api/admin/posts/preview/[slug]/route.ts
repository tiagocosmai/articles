import { auth } from "../../../../../../src/auth";
import { getAdminArticlePreview } from "../../../../../../src/api/adminArticlePreview";
import type { ReaderSession } from "../../../../../../src/api/reactions";
import { getDb } from "../../../../../../src/db/client";

export const runtime = "nodejs";

async function reader(): Promise<ReaderSession> {
  const session = await auth();
  if (!session?.userId || (session.role !== "admin" && session.role !== "member")) return null;
  return { id: session.userId, role: session.role, name: session.user?.name ?? "" };
}

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const result = await getAdminArticlePreview(getDb(), await reader(), slug);
  return Response.json(result.body, { status: result.status });
}
