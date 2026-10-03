import { getArticleList } from "../../../src/api/articles";
import { getDb } from "../../../src/db/client";

export const runtime = "nodejs";

export async function GET() {
  const result = await getArticleList(getDb());
  return Response.json(result.body, { status: result.status });
}
