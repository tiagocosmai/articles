import { forbidden, redirect } from "next/navigation";
import { auth } from "../../src/auth";

export const runtime = "nodejs";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.userId) redirect("/api/auth/signin?callbackUrl=/admin");
  if (session.role !== "admin") forbidden();
  return (
    <main>
      <h1>{session.user?.name}</h1>
    </main>
  );
}
