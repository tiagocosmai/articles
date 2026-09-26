import { useEffect, useMemo } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { loadCatalog, reportCatalogErrors } from "./content/loadCatalog";
import { LocaleProvider } from "./context/LocaleContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { ArticlePage } from "./pages/ArticlePage";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { routerBasename } from "./routing/basename";
import type { LoadedContent } from "./types/content";

function AppShell({ content }: { content: LoadedContent }) {
  const { mode } = useTheme();
  const themeClass =
    mode === "dark"
      ? "bg-surface-dark text-white"
      : "bg-surface-light text-ink";

  return (
    <div
      data-testid="app-shell"
      data-theme={mode}
      className={`flex min-h-screen flex-col ${themeClass}`}
    >
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <Routes>
          <Route path="/" element={<HomePage content={content} />} />
          <Route path="/:slug" element={<ArticlePage content={content} />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export function AppRoutes({ content }: { content: LoadedContent }) {
  return <AppShell content={content} />;
}

export default function App() {
  const content = useMemo(() => loadCatalog(), []);

  useEffect(() => {
    reportCatalogErrors(content.errors);
  }, [content]);

  return (
    <ThemeProvider>
      <LocaleProvider>
        <BrowserRouter basename={routerBasename(import.meta.env.BASE_URL)}>
          <AppRoutes content={content} />
        </BrowserRouter>
      </LocaleProvider>
    </ThemeProvider>
  );
}
