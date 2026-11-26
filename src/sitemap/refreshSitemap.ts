import { readPublishedCatalog } from "../db/catalog";
import type { TestDatabase } from "../db/testDb";
import { buildGeneratedBlogCatalog, buildSitemap } from "./buildSitemap";
import {
  publishSitemapFiles,
  SitemapPublishError,
  SitemapSnapshotChangedError,
} from "./githubPublisher";

function filesFor(catalog: Awaited<ReturnType<typeof readPublishedCatalog>>) {
  return {
    "public/sitemap.xml": buildSitemap(catalog),
    "src/data/generatedBlogCatalog.json": buildGeneratedBlogCatalog(catalog),
  };
}

function sameFiles(
  current: Awaited<ReturnType<typeof readPublishedCatalog>>,
  files: ReturnType<typeof filesFor>,
) {
  return (
    buildSitemap(current) === files["public/sitemap.xml"] &&
    buildGeneratedBlogCatalog(current) === files["src/data/generatedBlogCatalog.json"]
  );
}

export async function refreshPublishedSitemap(db: TestDatabase, token: string) {
  let lastConflict: "branch" | "snapshot" = "snapshot";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const catalog = await readPublishedCatalog(db);
    const files = filesFor(catalog);
    try {
      const result = await publishSitemapFiles(token, files, async () =>
        sameFiles(await readPublishedCatalog(db), files),
      );
      if (!sameFiles(await readPublishedCatalog(db), files)) {
        lastConflict = "snapshot";
        continue;
      }
      return {
        updated: result.updated,
        branch: result.branch,
        urlCount: 10 + catalog.articles.length * 3,
      };
    } catch (error) {
      if (error instanceof SitemapSnapshotChangedError) {
        lastConflict = "snapshot";
      } else if (error instanceof SitemapPublishError && [409, 422].includes(error.status)) {
        lastConflict = "branch";
      } else {
        throw error;
      }
    }
  }

  if (lastConflict === "branch") {
    throw new SitemapPublishError("The Portifolio branch changed during sitemap publishing", 409);
  }
  throw new SitemapSnapshotChangedError();
}
