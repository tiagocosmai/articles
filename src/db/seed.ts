import { loadCatalog, reportCatalogErrors } from "../content/loadCatalog";
import { getDb } from "./client";
import { seedCatalog } from "./seedCatalog";

const content = loadCatalog();
reportCatalogErrors(content.errors);
if (content.errors.length > 0) {
  process.exit(1);
}

await seedCatalog(getDb(), content);
