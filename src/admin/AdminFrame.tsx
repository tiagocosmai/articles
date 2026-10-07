import type { ReactNode } from "react";

export function AdminFrame({ view, children }: { view: "report" | "comments" | "posts"; children: ReactNode }) {
  return (
    <main>
      <nav aria-label="Administração">
        <a href="/admin" aria-current={view === "report" ? "page" : undefined}>
          Relatório
        </a>
        <a href="/admin/comentarios" aria-current={view === "comments" ? "page" : undefined}>
          Comentários
        </a>
        <a href="/admin/posts" aria-current={view === "posts" ? "page" : undefined}>
          Posts
        </a>
      </nav>
      {children}
    </main>
  );
}
