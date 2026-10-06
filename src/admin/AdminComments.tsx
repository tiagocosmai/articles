"use client";

import { useEffect, useState } from "react";
import type { AdminReportArticle } from "../api/adminReport";

type CommentStatus = "pending" | "approved" | "rejected";

type CommentRow = {
  id: string;
  articleSlug: string;
  articleTitle: string;
  authorName: string;
  createdAt: string;
  status: CommentStatus;
  body: string;
  parentId: string | null;
  error?: boolean;
};

const statusLinks: { label: string; status: CommentStatus | null }[] = [
  { label: "Todos", status: null },
  { label: "Pendente", status: "pending" },
  { label: "Aprovado", status: "approved" },
  { label: "Recusado", status: "rejected" },
];

function href(status: string | null, article: string | null) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (article) params.set("article", article);
  const query = params.toString();
  return query ? `/admin/comentarios?${query}` : "/admin/comentarios";
}

export function AdminComments({ status, article }: { status: string | null; article: string | null }) {
  const [rows, setRows] = useState<CommentRow[] | null>(null);
  const [articles, setArticles] = useState<AdminReportArticle[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let stopped = false;
    void (async () => {
      try {
        const listUrl = href(status, article).replace("/admin/comentarios", "/api/admin/comments");
        const [reportResponse, listResponse] = await Promise.all([fetch("/api/admin/report"), fetch(listUrl)]);
        if (!reportResponse.ok || !listResponse.ok) throw new Error("load");
        const report = (await reportResponse.json()) as { articles: AdminReportArticle[] };
        const list = (await listResponse.json()) as { comments: CommentRow[] };
        if (stopped) return;
        setArticles(report.articles);
        setRows(list.comments);
      } catch {
        if (!stopped) setError(true);
      }
    })();
    return () => {
      stopped = true;
    };
  }, [status, article]);

  async function change(row: CommentRow, next: CommentStatus) {
    const response = await fetch(`/api/admin/comments/${row.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!response.ok) {
      setRows((current) => current?.map((item) => (item.id === row.id ? { ...item, error: true } : item)) ?? null);
      return;
    }
    const body = (await response.json()) as { comment: CommentRow };
    setRows((current) => {
      if (!current) return current;
      if (status && status !== body.comment.status) return current.filter((item) => item.id !== row.id);
      return current.map((item) => (item.id === row.id ? { ...body.comment, error: false } : item));
    });
  }

  async function remove(row: CommentRow) {
    if (!window.confirm("Excluir este comentário?")) return;
    const response = await fetch(`/api/admin/comments/${row.id}`, { method: "DELETE" });
    if (!response.ok) {
      setRows((current) => current?.map((item) => (item.id === row.id ? { ...item, error: true } : item)) ?? null);
      return;
    }
    setRows((current) => current?.filter((item) => item.id !== row.id) ?? null);
  }

  if (error) return <p>Não foi possível carregar.</p>;
  if (!rows) return null;
  return (
    <section>
      <nav aria-label="Status">
        {statusLinks.map((link) => (
          <a key={link.label} href={href(link.status, article)}>
            {link.label}
          </a>
        ))}
      </nav>
      <nav aria-label="Artigos">
        <a href={href(status, null)}>Todos</a>
        {articles.map((item) => (
          <a key={item.slug} href={href(status, item.slug)}>
            {item.title}
          </a>
        ))}
      </nav>
      {rows.length === 0 ? <p>Não há itens para o filtro atual.</p> : null}
      <table>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.articleTitle}</td>
              <td>{row.authorName}</td>
              <td>{new Date(row.createdAt).toLocaleDateString("pt-BR")}</td>
              <td>{row.status}</td>
              <td>{row.body}</td>
              <td>{row.parentId ? "Resposta" : ""}</td>
              <td>
                {statusLinks.slice(1).map((link) => (
                  <button
                    key={link.status}
                    type="button"
                    disabled={row.status === link.status}
                    onClick={() => void change(row, link.status as CommentStatus)}
                  >
                    {link.label}
                  </button>
                ))}
                <button type="button" onClick={() => void remove(row)}>
                  Excluir
                </button>
                {row.error ? <p>Não foi possível salvar.</p> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
