"use client";

import { useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { AdminReportArticle } from "../api/adminReport";
import { DataTable } from "./ui/DataTable";
import { Tabs, TabsList, TabsTrigger } from "./ui/Tabs";

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
  const columns: ColumnDef<any, CommentRow>[] = [
    { accessorKey: "articleTitle", header: "Artigo" },
    { accessorKey: "authorName", header: "Autor" },
    {
      id: "createdAt",
      header: "Data",
      accessorFn: (row) => new Date(row.createdAt).toLocaleDateString("pt-BR"),
    },
    { accessorKey: "status", header: "Status" },
    { accessorKey: "body", header: "Comentário" },
    { id: "reply", header: "Tipo", accessorFn: (row) => (row.parentId ? "Resposta" : "") },
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => (
        <span className="flex flex-wrap gap-2">
          {statusLinks.slice(1).map((link) => (
            <button
              key={link.status}
              type="button"
              disabled={row.original.status === link.status}
              onClick={() => void change(row.original, link.status as CommentStatus)}
            >
              {link.label}
            </button>
          ))}
          <button type="button" onClick={() => void remove(row.original)}>
            Excluir
          </button>
          {row.original.error ? <p>Não foi possível salvar.</p> : null}
        </span>
      ),
    },
  ];

  return (
    <section>
      <Tabs value={status ?? "all"} variant="secondary">
        <TabsList aria-label="Status" size="sm">
          {statusLinks.map((link) => (
            <TabsTrigger key={link.label} value={link.status ?? "all"} href={href(link.status, article)}>
              {link.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <nav aria-label="Artigos">
        <a href={href(status, null)}>Todos</a>
        {articles.map((item) => (
          <a key={item.slug} href={href(status, item.slug)}>
            {item.title}
          </a>
        ))}
      </nav>
      {rows.length === 0 ? <p>Não há itens para o filtro atual.</p> : null}
      {rows.length > 0 ? <DataTable data={rows} columns={columns} /> : null}
    </section>
  );
}
