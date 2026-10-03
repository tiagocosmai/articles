"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authJsProviderId, type AuthMethodId } from "../../../src/auth/methods";

const methodIds = new Set<string>(Object.keys(authJsProviderId));

function isMethod(value: string): value is AuthMethodId {
  return methodIds.has(value);
}

function StartLogin() {
  const params = useSearchParams();
  const provider = params.get("provider") ?? "";
  const [message, setMessage] = useState(provider === "magiclink" ? "" : "Abrindo o login…");
  const [email, setEmail] = useState("");

  async function begin(method: AuthMethodId, address?: string) {
    const methods = (await (await fetch("/api/auth/methods")).json()) as {
      methods?: { id: AuthMethodId; configured: boolean }[];
    };
    const selected = methods.methods?.find((item) => item.id === method);
    if (!selected?.configured) {
      setMessage("Este acesso ainda precisa das credenciais no ambiente.");
      return;
    }
    const next = params.get("next") || "/";
    const callbackUrl = `/auth/done?next=${encodeURIComponent(next)}`;
    const csrf = (await (await fetch("/api/auth/csrf")).json()) as { csrfToken?: string };
    const form = document.createElement("form");
    form.method = "POST";
    form.action = `/api/auth/signin/${authJsProviderId[method]}`;
    const fields: Record<string, string> = { csrfToken: csrf.csrfToken ?? "", callbackUrl };
    if (address) fields.email = address;
    for (const [name, value] of Object.entries(fields)) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
  }

  useEffect(() => {
    if (!isMethod(provider) || provider === "magiclink") return;
    void begin(provider);
  }, [provider]);

  if (provider === "magiclink") {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void begin("magiclink", email);
        }}
      >
        <label>
          E-mail
          <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <button type="submit">Enviar link</button>
        {message ? <p>{message}</p> : null}
      </form>
    );
  }

  return <p>{message}</p>;
}

export default function StartLoginPage() {
  return (
    <Suspense>
      <StartLogin />
    </Suspense>
  );
}
