"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "../context/LocaleContext";
import { useTheme } from "../context/ThemeContext";
import { allowLoginCookie, readSignedIn } from "../auth/browserSession";
import { readGuestContact, writeGuestContact, type GuestContact } from "../auth/guest";
import { LoginPrompt } from "./LoginPrompt";

type ReactionSummary = {
  reactions: { type: string; count: number; mine: boolean }[];
};

const reactionTypes = ["like", "celebrate", "support", "love", "insightful", "funny"] as const;

const reactionColor: Record<(typeof reactionTypes)[number], string> = {
  like: "#378fe9",
  celebrate: "#6dae4f",
  support: "#a872e8",
  love: "#df704d",
  insightful: "#f5bb5c",
  funny: "#44bfd3",
};

export function ArticleReactions({
  slug,
  summary: providedSummary,
  signedIn: providedSignedIn,
}: {
  slug: string;
  summary?: ReactionSummary;
  signedIn?: boolean;
}) {
  const { t } = useLocale();
  const { mode } = useTheme();
  const [summary, setSummary] = useState(providedSummary);
  const [signedIn, setSignedIn] = useState(providedSignedIn ?? false);
  const [open, setOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [guest, setGuest] = useState<GuestContact | null>(null);
  const closeTimer = useRef<number | null>(null);
  const pendingType = useRef<string | null>(null);

  function showPicker() {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    setOpen(true);
  }

  function hidePicker() {
    closeTimer.current = window.setTimeout(() => setOpen(false), 180);
  }

  useEffect(() => {
    setGuest(readGuestContact());
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    };
  }, []);

  useEffect(() => {
    if (providedSummary && providedSignedIn !== undefined) return;
    let cancelled = false;
    void (async () => {
      const reactionsResponse = await fetch(`/api/articles/${slug}/reactions`);
      const next = (await reactionsResponse.json()) as ReactionSummary;
      if (cancelled) return;
      await allowLoginCookie();
      setSummary(next);
      setSignedIn(await readSignedIn());
    })();
    return () => {
      cancelled = true;
    };
  }, [providedSignedIn, providedSummary, slug]);

  if (!summary) return null;

  const mine = summary.reactions.find((reaction) => reaction.mine);
  const active = reactionTypes.find((type) => type === mine?.type) ?? "like";
  const buttonClass =
    mode === "dark" ? "border-brand/40 text-brand" : "border-brand-light/40 text-brand-light";

  function acceptGuest(contact: GuestContact) {
    writeGuestContact(contact);
    setGuest(contact);
    setLoginOpen(false);
    const type = pendingType.current;
    pendingType.current = null;
    if (type) void press(type, false, contact, false);
  }

  function acceptSignIn() {
    setSignedIn(true);
    setLoginOpen(false);
    const type = pendingType.current;
    pendingType.current = null;
    if (type) void press(type, false, null, true);
  }

  async function refreshSignedIn() {
    await allowLoginCookie();
    const next = await readSignedIn();
    setSignedIn(next);
    if (!next) setLoginOpen(true);
    return next;
  }

  async function press(type: string, alreadyMine: boolean, asGuest = guest, asSignedIn = signedIn) {
    setOpen(false);
    if (!asSignedIn && !asGuest) {
      if (await refreshSignedIn()) {
        asSignedIn = true;
      } else {
        pendingType.current = type;
        return;
      }
    }
    const response = alreadyMine
      ? await fetch(`/api/articles/${slug}/reactions/${type}`, { method: "DELETE" })
      : await fetch(`/api/articles/${slug}/reactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            name: asSignedIn ? undefined : asGuest?.name,
            email: asSignedIn ? undefined : asGuest?.email,
          }),
        });
    if (!response.ok) return;
    setSummary((await (await fetch(`/api/articles/${slug}/reactions`)).json()) as ReactionSummary);
  }

  return (
    <>
    <div className="relative" onMouseEnter={showPicker} onMouseLeave={hidePicker}>
      {open ? (
        <div className="absolute bottom-[calc(100%-4px)] left-1/2 z-20 -translate-x-1/2 px-3 pb-1">
          <div
            role="group"
            aria-label={t("reaction_like")}
            className="flex gap-1 rounded-full border border-white/10 bg-[#121816] px-1.5 py-1 shadow-lg"
          >
            {reactionTypes.map((type) => {
              const reaction = summary.reactions.find((item) => item.type === type);
              return (
                <button
                  key={type}
                  type="button"
                  aria-label={t(`reaction_${type}`)}
                  aria-pressed={reaction?.mine ?? false}
                  title={t(`reaction_${type}`)}
                  onClick={() => void press(type, Boolean(reaction?.mine))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: reactionColor[type] }}
                >
                  <ReactionIcon type={type} />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      <button
        type="button"
        aria-label={t(`reaction_${mine?.type ?? "like"}`)}
        aria-pressed={Boolean(mine)}
        aria-expanded={open}
        title={t(`reaction_${mine?.type ?? "like"}`)}
        onClick={() => {
          if (!signedIn && !guest) {
            pendingType.current = active;
            void refreshSignedIn();
            return;
          }
          showPicker();
        }}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-md border ${buttonClass}`}
        style={mine ? { color: reactionColor[active] } : undefined}
      >
        <ReactionIcon type={active} />
      </button>
    </div>
    <LoginPrompt
      open={loginOpen}
      slug={slug}
      onClose={() => setLoginOpen(false)}
      onSignedIn={acceptSignIn}
      onGuest={acceptGuest}
    />
    </>
  );
}

function ReactionIcon({ type }: { type: (typeof reactionTypes)[number] }) {
  const className = "h-4 w-4";
  if (type === "celebrate") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
        <path d="M8 11.5 6.2 8.2a1.2 1.2 0 0 1 .4-1.7 1.3 1.3 0 0 1 1.8.5L10 10.2V6.2a1.2 1.2 0 1 1 2.4 0V10l1.2-2.8a1.2 1.2 0 0 1 2.2.9L14.2 12H16a1.2 1.2 0 0 1 1.1 1.6l-2.2 5.2a2 2 0 0 1-1.8 1.2H9.2A2.2 2.2 0 0 1 7 17.6V12.2a2 2 0 0 1 1-1.7Z" />
      </svg>
    );
  }
  if (type === "support") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
        <path d="M12 19.2s-6.2-3.8-6.2-8.1A3.3 3.3 0 0 1 12 8.6a3.3 3.3 0 0 1 6.2 2.5c0 4.3-6.2 8.1-6.2 8.1Z" />
        <path d="M4.2 14.2c.2 2.4 1.6 4.2 3.6 5.2M19.8 14.2c-.2 2.4-1.6 4.2-3.6 5.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }
  if (type === "love") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
        <path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9Z" />
      </svg>
    );
  }
  if (type === "insightful") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
        <path d="M12 3a6 6 0 0 0-3.2 11.1c.5.4.8 1 .8 1.6V17h4.8v-1.3c0-.6.3-1.2.8-1.6A6 6 0 0 0 12 3Zm-1.6 16h3.2v1.2a1.6 1.6 0 0 1-3.2 0V19Z" />
      </svg>
    );
  }
  if (type === "funny") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
        <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-3.2 7.2a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Zm6.4 0a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4ZM12 16.5c2 0 3.4-1.2 3.8-2.2H8.2c.4 1 1.8 2.2 3.8 2.2Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M7 11v8H4v-8h3Zm2.2 8c-.7 0-1.2-.5-1.2-1.2V11.4c0-.3.1-.6.3-.8l4.2-4.4.4-.4c.4-.4 1-.3 1.3.2l.2.6-.8 3.2h4.2c.8 0 1.4.7 1.3 1.5l-.8 5.2a1.4 1.4 0 0 1-1.4 1.2H9.2Z" />
    </svg>
  );
}
