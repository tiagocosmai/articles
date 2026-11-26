import { auth } from "../../../../src/auth";
import { getDb } from "../../../../src/db/client";
import { refreshPublishedSitemap } from "../../../../src/sitemap/refreshSitemap";
import { SitemapPublishError, SitemapSnapshotChangedError } from "../../../../src/sitemap/githubPublisher";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST() {
  const session = await auth();
  if (!session?.userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (session.role !== "admin") return Response.json({ error: "forbidden" }, { status: 403 });

  const token = process.env.SITEMAP_GITHUB_TOKEN;
  if (!token) return Response.json({ error: "token_missing" }, { status: 503 });

  try {
    const result = await refreshPublishedSitemap(getDb(), token);
    return Response.json(result);
  } catch (error) {
    if (error instanceof SitemapSnapshotChangedError) {
      return Response.json({ error: "snapshot_changed" }, { status: 409 });
    }
    const status = error instanceof SitemapPublishError && error.status === 409 ? 409 : 502;
    return Response.json({ error: status === 409 ? "branch_changed" : "github_publish_failed" }, { status });
  }
}
