"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { AdminPost } from "../api/adminPosts";
import { linkedInShareHref } from "../share/articleShareUrl";
import { DataTable } from "./ui/DataTable";

const stateLabel = {
  live: "No ar",
  hidden: "Oculto",
  empty: "Sem corpo",
  scheduled: "Agendado",
} as const;

type FormState = {
  id: string | null;
  slug: string;
  publishedOn: string;
  title: { pt: string; en: string; es: string };
  description: { pt: string; en: string; es: string };
};

function blankForm(): FormState {
  return {
    id: null,
    slug: "",
    publishedOn: "",
    title: { pt: "", en: "", es: "" },
    description: { pt: "", en: "", es: "" },
  };
}

function formFrom(post: AdminPost): FormState {
  return {
    id: post.id,
    slug: post.slug,
    publishedOn: post.publishedOn,
    title: { ...post.title },
    description: { ...post.description },
  };
}

function titleOf(post: AdminPost) {
  return post.title.pt || post.title.en || post.title.es || post.slug;
}

export function AdminPosts() {
  const [posts, setPosts] = useState<AdminPost[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const [importErrors, setImportErrors] = useState<string[] | null>(null);
  const [importConflict, setImportConflict] = useState<{ markdown: string; slug: string } | null>(null);
  const fileInputId = "admin-import-markdown";

  useEffect(() => {
    let stopped = false;
    void (async () => {
      try {
        const response = await fetch("/api/admin/posts");
        if (!response.ok) throw new Error("load");
        const body = (await response.json()) as { posts: AdminPost[] };
        if (!stopped) setPosts(body.posts);
      } catch {
        if (!stopped) setLoadError(true);
      }
    })();
    return () => {
      stopped = true;
    };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    const response = await fetch(form.id ? `/api/admin/posts/${form.id}` : "/api/admin/posts", {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: form.slug,
        publishedOn: form.publishedOn,
        title: form.title,
        description: form.description,
      }),
    });
    if (!response.ok) {
      setSaveError(true);
      return;
    }
    const body = (await response.json()) as { post: AdminPost };
    setPosts((current) => {
      if (!current) return [body.post];
      if (!form.id) return [...current, body.post];
      return current.map((item) => (item.id === body.post.id ? body.post : item));
    });
    setSaveError(false);
    setForm(null);
  }

  async function runImport(markdown: string, action?: "create" | "update" | "cancel") {
    const response = await fetch("/api/admin/posts/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markdown, action }),
    });
    if (!response.ok) return;
    const body = (await response.json()) as
      | { status: "invalid"; errors: string[] }
      | { status: "ready"; slug: string; conflict: boolean }
      | { status: "created" | "updated"; post: AdminPost }
      | { status: "cancelled" };
    if (body.status === "invalid") {
      setImportErrors(body.errors);
      return;
    }
    setImportErrors(null);
    if (body.status === "ready") {
      if (body.conflict) {
        setImportConflict({ markdown, slug: body.slug });
        return;
      }
      await runImport(markdown, "create");
      return;
    }
    if (body.status === "created" || body.status === "updated") {
      setImportConflict(null);
      setPosts((current) => {
        if (!current) return [body.post];
        const index = current.findIndex((item) => item.id === body.post.id);
        if (index === -1) return [...current, body.post];
        return current.map((item) => (item.id === body.post.id ? body.post : item));
      });
    }
  }

  async function toggle(post: AdminPost) {
    const response = await fetch(`/api/admin/posts/${post.id}/visibility`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: post.state === "hidden" }),
    });
    if (!response.ok) {
      setRowError(post.id);
      return;
    }
    const body = (await response.json()) as { post: AdminPost };
    setRowError(null);
    setPosts((current) => current?.map((item) => (item.id === body.post.id ? body.post : item)) ?? null);
  }

  if (loadError) return <p>Não foi possível carregar.</p>;
  if (!posts) return null;
  if (form) {
    return (
      <form onSubmit={(event) => void save(event)}>
        <label htmlFor="slug">Slug</label>
        <input id="slug" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} />
        <label htmlFor="publishedOn">Data</label>
        <input
          id="publishedOn"
          type="date"
          value={form.publishedOn}
          onChange={(event) => setForm({ ...form, publishedOn: event.target.value })}
        />
        {(["pt", "en", "es"] as const).map((locale) => {
          const titleLabel = locale === "pt" ? "Título em português" : locale === "en" ? "Título em inglês" : "Título em espanhol";
          const descriptionLabel =
            locale === "pt" ? "Descrição em português" : locale === "en" ? "Descrição em inglês" : "Descrição em espanhol";
          return (
            <span key={locale}>
              <label htmlFor={`title-${locale}`}>{titleLabel}</label>
              <input
                id={`title-${locale}`}
                value={form.title[locale]}
                onChange={(event) => setForm({ ...form, title: { ...form.title, [locale]: event.target.value } })}
              />
              <label htmlFor={`description-${locale}`}>{descriptionLabel}</label>
              <input
                id={`description-${locale}`}
                value={form.description[locale]}
                onChange={(event) =>
                  setForm({ ...form, description: { ...form.description, [locale]: event.target.value } })
                }
              />
            </span>
          );
        })}
        {saveError ? <p>Não foi possível salvar.</p> : null}
        <button
          type="button"
          onClick={() => {
            setSaveError(false);
            setForm(null);
          }}
        >
          Voltar
        </button>
        <button type="submit">Salvar</button>
      </form>
    );
  }

  const postColumns: ColumnDef<any, AdminPost>[] = [
    { id: "title", header: "Título", accessorFn: (post) => titleOf(post) },
    { accessorKey: "slug", header: "Slug" },
    { accessorKey: "publishedOn", header: "Data" },
    { id: "state", header: "Estado", accessorFn: (post) => stateLabel[post.state] },
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => (
        <span className="flex flex-wrap gap-2">
          <a href={`/admin/preview/${row.original.slug}`}>Visualizar</a>
          <button type="button" onClick={() => setForm(formFrom(row.original))}>
            Editar
          </button>
          <button type="button" onClick={() => void toggle(row.original)}>
            {row.original.state === "hidden" ? "Ativar" : "Desativar"}
          </button>
          {row.original.state === "live" && row.original.linkedInPt ? (
            <a href={linkedInShareHref(row.original.linkedInPt)} target="_blank" rel="noreferrer">
              Compartilhar no LinkedIn
            </a>
          ) : (
            <button type="button" disabled>
              Compartilhar no LinkedIn
            </button>
          )}
          {rowError === row.original.id ? <p>Não foi possível salvar.</p> : null}
        </span>
      ),
    },
  ];

  return (
    <section>
      <div className="mb-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => {
            setSaveError(false);
            setForm(blankForm());
          }}
        >
          Novo post
        </button>
        <button type="button" onClick={() => document.getElementById(fileInputId)?.click()}>
          Importar markdown
        </button>
        <input
          id={fileInputId}
          type="file"
          accept=".md,text/markdown"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            void file.text().then((markdown) => runImport(markdown));
          }}
        />
      </div>
      {importErrors ? (
        <div role="alert">
          <p>O arquivo não pôde ser importado:</p>
          <ul>
            {importErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {importConflict ? (
        <div role="dialog" aria-label="Slug já existe">
          <p>
            O slug <strong>{importConflict.slug}</strong> já existe. Deseja atualizar o post ou recusar a importação?
          </p>
          <button type="button" onClick={() => void runImport(importConflict.markdown, "update")}>
            Atualizar
          </button>
          <button
            type="button"
            onClick={() => {
              setImportConflict(null);
              void runImport(importConflict.markdown, "cancel");
            }}
          >
            Recusar
          </button>
        </div>
      ) : null}
      {posts.length === 0 ? <p>Não há posts.</p> : null}
      {posts.length > 0 ? <DataTable data={posts} columns={postColumns} /> : null}
    </section>
  );
}
