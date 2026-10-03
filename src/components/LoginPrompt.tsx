"use client";

import { useEffect, useState } from "react";
import { allowLoginCookie, readSignedIn } from "../auth/browserSession";
import { useLocale } from "../context/LocaleContext";

export function LoginPrompt({
  open,
  slug,
  onClose,
  onSignedIn,
}: {
  open: boolean;
  slug: string;
  onClose: () => void;
  onSignedIn: () => void;
}) {
  const { t } = useLocale();
  const [needsCookie, setNeedsCookie] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { source?: string } | null;
      if (data?.source !== "tiagocosmai-auth") return;
      void finish();
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [open]);

  if (!open) return null;

  async function finish() {
    const allowed = await allowLoginCookie();
    if (!allowed) {
      setNeedsCookie(true);
      return;
    }
    if (await readSignedIn()) {
      onSignedIn();
      onClose();
    }
  }

  function start(provider: "github" | "linkedin") {
    const next = `/${slug}`;
    const url = new URL("/auth/start", window.location.origin);
    url.searchParams.set("provider", provider);
    url.searchParams.set("next", next);
    const popup = window.open(url.href, "articles-auth", "popup,width=480,height=720");
    if (!popup) {
      setPopupBlocked(true);
      return;
    }
    setPopupBlocked(false);
    const timer = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(timer);
        void finish();
      }
    }, 400);
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
          <button type="button" onClick={() => start("github")} className="rounded-full border border-brand/40 px-3 py-2 font-bold">
            {t("login_github")}
          </button>
          <button type="button" onClick={() => start("linkedin")} className="rounded-full border border-brand/40 px-3 py-2 font-bold">
            {t("login_linkedin")}
          </button>
          {needsCookie ? (
            <button type="button" onClick={() => void finish()} className="rounded-full border border-brand/40 px-3 py-2 font-bold">
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
