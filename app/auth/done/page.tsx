"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { publishLoginFinished } from "../../../src/auth/browserSession";

function FinishLogin() {
  const params = useSearchParams();

  useEffect(() => {
    const next = params.get("next") || "/";
    const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
    publishLoginFinished();
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ source: "tiagocosmai-auth" }, window.location.origin);
    }
    window.close();
    const timer = window.setTimeout(() => {
      if (!window.closed) window.location.replace(safeNext);
    }, 400);
    return () => window.clearTimeout(timer);
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
