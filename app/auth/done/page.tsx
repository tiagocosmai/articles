"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

function FinishLogin() {
  const params = useSearchParams();

  useEffect(() => {
    const next = params.get("next") || "/";
    const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ source: "tiagocosmai-auth" }, window.location.origin);
      window.close();
      return;
    }
    window.location.replace(safeNext);
  }, [params]);

  return <p>Login concluído.</p>;
}

export default function FinishLoginPage() {
  return (
    <Suspense>
      <FinishLogin />
    </Suspense>
  );
}
