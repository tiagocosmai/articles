import { auth } from "../../../src/auth";
import { AdminHome } from "../../../src/admin/AdminHome";

export const runtime = "nodejs";

export default async function AdminCommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; article?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const role = session?.userId && (session.role === "admin" || session.role === "member") ? session.role : null;
  return <AdminHome role={role} view="comments" status={params.status ?? null} article={params.article ?? null} />;
}
