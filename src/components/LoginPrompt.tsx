"use client";

import { useEffect, useRef, useState } from "react";
import { allowLoginCookie, loginSignalKey, readSignedIn, waitForSignedIn } from "../auth/browserSession";
import { guestContact, type GuestContact } from "../auth/guest";
import { type AuthMethodId } from "../auth/methods";
import { useLocale } from "../context/LocaleContext";

const defaultMethods: AuthMethodId[] = ["github", "gmail", "magiclink"];

export function LoginPrompt({
  open,
  slug,
  onClose,
  onSignedIn,
  onGuest,
}: {
  open: boolean;
  slug: string;
  onClose: () => void;
  onSignedIn: () => void;
  onGuest: (contact: GuestContact) => void;
}) {
  const { t } = useLocale();
  const [needsCookie, setNeedsCookie] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [methods, setMethods] = useState<AuthMethodId[]>(defaultMethods);
  const [guestOpen, setGuestOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [guestError, setGuestError] = useState(false);
  const onSignedInRef = useRef(onSignedIn);
  const onCloseRef = useRef(onClose);
  onSignedInRef.current = onSignedIn;
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    let stopped = false;
    void (async () => {
      try {
        const payload = (await (await fetch("/api/auth/methods")).json()) as { methods?: { id: AuthMethodId }[] };
        if (!stopped && Array.isArray(payload.methods) && payload.methods.length > 0) {
          setMethods(payload.methods.map((method) => method.id));
        }
      } catch {
        /* Keep the default methods when the list cannot be loaded. */
      }
    })();
    async function finish() {
      await allowLoginCookie();
      if (stopped) return;
      if (await waitForSignedIn()) {
        onSignedInRef.current();
        onCloseRef.current();
        return;
      }
      setNeedsCookie(true);
    }
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { source?: string } | null;
      if (data?.source !== "tiagocosmai-auth") return;
      void finish();
    }
    function onStorage(event: StorageEvent) {
      if (event.key !== loginSignalKey) return;
      void finish();
    }
    window.addEventListener("message", onMessage);
    window.addEventListener("storage", onStorage);
    return () => {
      stopped = true;
      window.removeEventListener("message", onMessage);
      window.removeEventListener("storage", onStorage);
    };
  }, [open]);

  if (!open) return null;

  function start(provider: AuthMethodId) {
    void allowLoginCookie();
    const url = new URL("/auth/start", window.location.origin);
    url.searchParams.set("provider", provider);
    url.searchParams.set("next", `/${slug}`);
    const popup = window.open(url.href, "articles-auth", "popup,width=480,height=720");
    if (!popup) {
      setPopupBlocked(true);
      return;
    }
    setPopupBlocked(false);
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      let closed = false;
      try {
        closed = popup.closed;
      } catch {
        closed = true;
      }
      void readSignedIn().then((signedIn) => {
        if (signedIn) {
          window.clearInterval(timer);
          onSignedInRef.current();
          onCloseRef.current();
          return;
        }
        if (closed) setNeedsCookie(true);
        if (attempts > 120) window.clearInterval(timer);
      });
    }, 500);
  }

  function submitGuest() {
    const contact = guestContact(name, email);
    if (!contact) {
      setGuestError(true);
      return;
    }
    onGuest(contact);
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-prompt-title"
        className="max-w-md rounded-lg border border-brand/40 bg-[#121816] p-4 text-white"
      >
        <h2 id="login-prompt-title" className="text-lg font-bold">
          {t("login_title")}
        </h2>
        <p className="mt-2 text-sm">{t("login_reasons")}</p>
        <div className="mt-4 flex flex-col gap-2">
          {methods.map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => start(method)}
              className="rounded-full border border-brand/40 px-3 py-2 font-bold"
            >
              {t(`login_${method}`)}
            </button>
          ))}
          {guestOpen ? (
            <form
              className="flex flex-col gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                submitGuest();
              }}
            >
              <input
                aria-label={t("login_guest_name")}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="rounded-md border border-brand/40 bg-transparent px-3 py-2"
              />
              <input
                aria-label={t("login_guest_email")}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="rounded-md border border-brand/40 bg-transparent px-3 py-2"
              />
              {guestError ? <p className="text-sm">{t("login_guest_invalid")}</p> : null}
              <button type="submit" className="rounded-full border border-brand/40 px-3 py-2 font-bold">
                {t("login_guest_submit")}
              </button>
            </form>
          ) : (
            <button type="button" onClick={() => setGuestOpen(true)} className="rounded-full border border-brand/40 px-3 py-2 font-bold">
              {t("login_guest")}
            </button>
          )}
          {needsCookie ? (
            <button
              type="button"
              onClick={() => {
                void allowLoginCookie().then(async (allowed) => {
                  if (allowed && (await readSignedIn())) onSignedInRef.current();
                });
              }}
              className="rounded-full border border-brand/40 px-3 py-2 font-bold"
            >
              {t("login_keep")}
            </button>
          ) : null}
          {popupBlocked ? <p className="text-sm">{t("login_popup_blocked")}</p> : null}
          <button type="button" onClick={onClose} className="text-sm">
            {t("login_close")}
          </button>
        </div>
      </div>
    </div>
  );
}
