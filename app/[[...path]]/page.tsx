import { loadCatalog, reportCatalogErrors } from "../../src/content/loadCatalog";
import { ArticlesShell } from "../../src/ArticlesShell";

export const runtime = "nodejs";

export default function Page() {
  const content = loadCatalog();
  reportCatalogErrors(content.errors);
  return <ArticlesShell content={content} />;
}
