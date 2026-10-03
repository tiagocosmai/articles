"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

function StartLogin() {
  const params = useSearchParams();

  useEffect(() => {
    const provider = params.get("provider") === "linkedin" ? "linkedin" : "github";
    const next = params.get("next") || "/";
    const callbackUrl = `/auth/done?next=${encodeURIComponent(next)}`;
    void (async () => {
      const csrf = (await (await fetch("/api/auth/csrf")).json()) as { csrfToken?: string };
      const form = document.createElement("form");
      form.method = "POST";
      form.action = `/api/auth/signin/${provider}`;
      for (const [name, value] of Object.entries({
        csrfToken: csrf.csrfToken ?? "",
        callbackUrl,
      })) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();
    })();
  }, [params]);

  return <p>Abrindo o login…</p>;
}

export default function StartLoginPage() {
  return (
    <Suspense>
      <StartLogin />
    </Suspense>
  );
}
