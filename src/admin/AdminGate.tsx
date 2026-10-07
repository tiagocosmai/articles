"use client";

import { useState, type ReactNode } from "react";
import { LoginPrompt } from "../components/LoginPrompt";
import { LocaleProvider } from "../context/LocaleContext";
import { adminDeniedMessage } from "./gate";

export function AdminGate({
  role,
  returnPath,
  children,
}: {
  role: "admin" | "member" | null;
  returnPath: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(role !== "admin");
  const [denied, setDenied] = useState(role === "member");

  if (role !== "admin") {
    return (
      <LocaleProvider>
        {denied ? (
          <p className="fixed inset-x-0 top-6 z-40 mx-auto max-w-md rounded-lg bg-[#121816] px-4 py-3 text-center text-white">
            {adminDeniedMessage}
          </p>
        ) : null}
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
