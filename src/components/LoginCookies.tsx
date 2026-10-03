"use client";

import { useEffect, useState } from "react";
import { useLocale } from "../context/LocaleContext";

type StorageDocument = Document & {
  hasStorageAccess?: () => Promise<boolean>;
  requestStorageAccess?: () => Promise<void>;
};

export function LoginCookies() {
  const { t } = useLocale();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.parent === window.self) return;
    const storage = document as StorageDocument;
    if (!storage.hasStorageAccess) return;
    let cancelled = false;
    void storage.hasStorageAccess().then((allowed) => {
      if (!cancelled && !allowed) setVisible(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible) return null;

  async function allow() {
    const storage = document as StorageDocument;
    try {
      await storage.requestStorageAccess?.();
    } catch {
      return;
    }
    window.location.reload();
  }

  return (
    <div
      role="region"
      aria-label={t("cookie_login_label")}
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand/40 px-3 py-2 text-sm"
    >
      <p>{t("cookie_login_body")}</p>
      <button
        type="button"
        onClick={() => void allow()}
        className="rounded-full border border-brand/40 px-3 py-1 font-bold"
      >
        {t("cookie_login_allow")}
      </button>
    </div>
  );
}
