"use client";

import { useEffect, useState } from "react";
import type { AdminReportArticle } from "../api/adminReport";

const reactionKeys = ["like", "celebrate", "support", "love", "insightful", "funny"] as const;
const headers = ["Artigo", "Pendentes", "Aprovados", "Recusados", "Gostei", "Parabéns", "Apoio", "Amei", "Genial", "Divertido"];

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
  return (
    <table>
      <thead>
        <tr>
          {headers.map((header) => (
            <th key={header}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {articles.map((article) => (
          <tr key={article.slug}>
            <td>{article.title}</td>
            <td>{article.comments.pending}</td>
            <td>{article.comments.approved}</td>
            <td>{article.comments.rejected}</td>
            {reactionKeys.map((key) => (
              <td key={key}>{article.reactions[key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
