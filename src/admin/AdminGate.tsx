"use client";

import { useEffect, useState, type ReactNode } from "react";
import { LoginPrompt } from "../components/LoginPrompt";
import { LocaleProvider } from "../context/LocaleContext";
import { adminBlogHome, adminDeniedMessage } from "./gate";

export function AdminGate({
  role,
  returnPath,
  go = (url: string) => window.location.assign(url),
  children,
}: {
  role: "admin" | "member" | null;
  returnPath: string;
  go?: (url: string) => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(role === null);
  const [denied, setDenied] = useState(role === "member");

  useEffect(() => {
    if (denied) go(adminBlogHome);
  }, [denied, go]);

  if (denied) return <p>{adminDeniedMessage}</p>;
  if (role !== "admin") {
    return (
      <LocaleProvider>
        {open ? (
          <LoginPrompt
            open
            slug={returnPath}
            onClose={() => setOpen(false)}
            onSignedIn={() => window.location.reload()}
            onGuest={() => setDenied(true)}
          />
        ) : (
          <button type="button" onClick={() => setOpen(true)}>
            Entrar
          </button>
        )}
      </LocaleProvider>
    );
  }
  return children;
}
