"use client";

import { AdminComments } from "./AdminComments";
import { AdminFrame } from "./AdminFrame";
import { AdminGate } from "./AdminGate";
import { AdminPosts } from "./AdminPosts";
import { AdminReport } from "./AdminReport";

export function AdminHome({
  role,
  view,
  status = null,
  article = null,
}: {
  role: "admin" | "member" | null;
  view: "report" | "comments" | "posts";
  status?: string | null;
  article?: string | null;
}) {
  return (
    <AdminGate
      role={role}
      returnPath={view === "report" ? "admin" : view === "comments" ? "admin/comentarios" : "admin/posts"}
    >
      <AdminFrame view={view}>
        {view === "report" ? (
          <AdminReport />
        ) : view === "comments" ? (
          <AdminComments status={status} article={article} />
        ) : (
          <AdminPosts />
        )}
      </AdminFrame>
    </AdminGate>
  );
}
