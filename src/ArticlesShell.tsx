"use client";

import { useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { LocaleProvider } from "./context/LocaleContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AppRoutes } from "./AppRoutes";
import type { LoadedContent } from "./types/content";

export function ArticlesShell({ content }: { content: LoadedContent }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div
        data-testid="app-shell"
        data-theme="dark"
        className="h-full min-h-full bg-surface-dark"
      />
    );
  }

  return (
    <ThemeProvider>
      <LocaleProvider>
        <BrowserRouter>
          <AppRoutes content={content} />
        </BrowserRouter>
      </LocaleProvider>
    </ThemeProvider>
  );
}
