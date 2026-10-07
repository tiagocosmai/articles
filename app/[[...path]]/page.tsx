import { permanentRedirect } from "next/navigation";
import { getArticleBySlug, getArticleList } from "../../src/api/articles";
import { getDb } from "../../src/db/client";
import { ArticlesShell } from "../../src/ArticlesShell";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  if (path?.length === 1) {
    const found = await getArticleBySlug(getDb(), path[0]);
    if (found.status === 301) permanentRedirect(`/${found.body.slug}`);
  }
  const result = await getArticleList(getDb());
  return <ArticlesShell content={result.body} />;
}
