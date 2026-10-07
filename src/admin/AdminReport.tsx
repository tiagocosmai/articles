"use client";

import { useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { AdminReportArticle } from "../api/adminReport";
import { DataTable } from "./ui/DataTable";

const reactionKeys = ["like", "celebrate", "support", "love", "insightful", "funny"] as const;
const reactionHeaders = ["Gostei", "Parabéns", "Apoio", "Amei", "Genial", "Divertido"] as const;

const columns: ColumnDef<any, AdminReportArticle>[] = [
  { accessorKey: "title", header: "Artigo" },
  { id: "pending", header: "Pendentes", accessorFn: (article) => article.comments.pending },
  { id: "approved", header: "Aprovados", accessorFn: (article) => article.comments.approved },
  { id: "rejected", header: "Recusados", accessorFn: (article) => article.comments.rejected },
  ...reactionKeys.map(
    (key, index): ColumnDef<any, AdminReportArticle> => ({
      id: key,
      header: reactionHeaders[index],
      accessorFn: (article) => article.reactions[key],
    }),
  ),
];

export function AdminReport() {
  const [articles, setArticles] = useState<AdminReportArticle[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let stopped = false;
    void (async () => {
      try {
        const response = await fetch("/api/admin/report");
        if (!response.ok) throw new Error("load");
        const body = (await response.json()) as { articles: AdminReportArticle[] };
        if (!stopped) setArticles(body.articles);
      } catch {
        if (!stopped) setError(true);
      }
    })();
    return () => {
      stopped = true;
    };
  }, []);

  if (error) return <p>Não foi possível carregar.</p>;
  if (!articles) return null;
  if (articles.length === 0) return <p>Não há itens para o filtro atual.</p>;
  return <DataTable data={articles} columns={columns} />;
}
