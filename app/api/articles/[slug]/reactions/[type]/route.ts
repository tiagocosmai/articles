import { deleteReaction } from "../../../../../../src/api/reactions";
import { readSessionId } from "../../../../../../src/auth/visitor";
import { getDb } from "../../../../../../src/db/client";

export const runtime = "nodejs";

export async function DELETE(request: Request, context: { params: Promise<{ slug: string; type: string }> }) {
  const { slug, type } = await context.params;
  const result = await deleteReaction(getDb(), slug, readSessionId(request.headers.get("cookie")), type);
  return Response.json(result.body, { status: result.status });
}
