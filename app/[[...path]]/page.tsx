import { getArticleList } from "../../src/api/articles";
import { getDb } from "../../src/db/client";
import { ArticlesShell } from "../../src/ArticlesShell";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Page() {
  const result = await getArticleList(getDb());
  return <ArticlesShell content={result.body} />;
}
