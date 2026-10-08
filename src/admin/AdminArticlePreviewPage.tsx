"use client";

import { LocaleProvider } from "../context/LocaleContext";
import { ThemeProvider } from "../context/ThemeContext";
import type { AdminArticlePreview } from "../api/adminArticlePreview";
import { AdminArticlePreviewView } from "./AdminArticlePreviewView";
import { AdminGate } from "./AdminGate";

export function AdminArticlePreviewPage({
  role,
  slug,
  preview,
}: {
  role: "admin" | "member" | null;
  slug: string;
  preview: AdminArticlePreview | null;
}) {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <AdminGate role={role} returnPath={`admin/preview/${slug}`}>
          {preview ? <AdminArticlePreviewView preview={preview} /> : <p className="p-6 text-white">Artigo não encontrado.</p>}
        </AdminGate>
      </LocaleProvider>
    </ThemeProvider>
  );
}
