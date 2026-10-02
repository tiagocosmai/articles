import { Route, Routes } from "react-router-dom";
import { useTheme } from "./context/ThemeContext";
import { useEmbedBridge } from "./embed/useEmbedBridge";
import { useEmbedLocation } from "./embed/useEmbedLocation";
import { ArticlePage } from "./screens/ArticlePage";
import { HomePage } from "./screens/HomePage";
import { NotFoundPage } from "./screens/NotFoundPage";
import type { LoadedContent } from "./types/content";

function AppShell({ content }: { content: LoadedContent }) {
  const { mode } = useTheme();
  useEmbedBridge();
  useEmbedLocation();
  const themeClass =
    mode === "dark"
      ? "bg-surface-dark text-white"
      : "bg-surface-light text-ink";

  return (
    <div
      data-testid="app-shell"
      data-theme={mode}
      className={`flex h-full min-h-full flex-col ${themeClass}`}
    >
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Routes>
          <Route path="/" element={<HomePage content={content} />} />
          <Route path="/:slug" element={<ArticlePage content={content} />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
}

export function AppRoutes({ content }: { content: LoadedContent }) {
  return <AppShell content={content} />;
}
