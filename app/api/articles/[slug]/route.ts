import { getArticleBySlug } from "../../../../src/api/articles";
import { getDb } from "../../../../src/db/client";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const result = await getArticleBySlug(getDb(), slug);
  return Response.json(result.body, { status: result.status });
}
