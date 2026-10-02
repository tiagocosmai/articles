import { useEffect, useMemo } from "react";
import { ArticlesShell } from "./ArticlesShell";
import { loadCatalog, reportCatalogErrors } from "./content/loadCatalog";

export { AppRoutes } from "./AppRoutes";

export default function App() {
  const content = useMemo(() => loadCatalog(), []);

  useEffect(() => {
    reportCatalogErrors(content.errors);
  }, [content]);

  return <ArticlesShell content={content} />;
}
