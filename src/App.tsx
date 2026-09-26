import { useEffect, useMemo } from "react";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { loadCatalog, reportCatalogErrors } from "./content/loadCatalog";
import { LocaleProvider } from "./context/LocaleContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { HomePage } from "./pages/HomePage";
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
        <HomePage content={content} />
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  const content = useMemo(() => loadCatalog(), []);

  useEffect(() => {
    reportCatalogErrors(content.errors);
  }, [content]);

  return (
    <ThemeProvider>
      <LocaleProvider>
        <AppShell content={content} />
      </LocaleProvider>
    </ThemeProvider>
  );
}
