import { auth } from "../../../../src/auth";
import { getAdminArticlePreview } from "../../../../src/api/adminArticlePreview";
import { AdminArticlePreviewPage } from "../../../../src/admin/AdminArticlePreviewPage";
import { getDb } from "../../../../src/db/client";
import type { ReaderSession } from "../../../../src/api/reactions";

export const runtime = "nodejs";

function reader(session: Awaited<ReturnType<typeof auth>>): ReaderSession {
  if (!session?.userId || (session.role !== "admin" && session.role !== "member")) return null;
  return { id: session.userId, role: session.role, name: session.user?.name ?? "" };
}

export default async function AdminPreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  const role = session?.userId && (session.role === "admin" || session.role === "member") ? session.role : null;
  const result = role === "admin" ? await getAdminArticlePreview(getDb(), reader(session), slug) : null;
  const preview = result?.status === 200 ? result.body : null;

  return <AdminArticlePreviewPage role={role} slug={slug} preview={preview} />;
}
