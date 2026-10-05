"use client";

import { AdminComments } from "./AdminComments";
import { AdminFrame } from "./AdminFrame";
import { AdminGate } from "./AdminGate";
import { AdminReport } from "./AdminReport";

export function AdminHome({
  role,
  view,
  status = null,
  article = null,
}: {
  role: "admin" | "member" | null;
  view: "report" | "comments";
  status?: string | null;
  article?: string | null;
}) {
  return (
    <AdminGate role={role} returnPath={view === "report" ? "admin" : "admin/comentarios"}>
      <AdminFrame view={view}>
        {view === "report" ? <AdminReport /> : <AdminComments status={status} article={article} />}
      </AdminFrame>
    </AdminGate>
  );
}
