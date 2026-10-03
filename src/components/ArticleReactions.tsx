"use client";

import { useEffect, useState } from "react";
import { useLocale } from "../context/LocaleContext";

type ReactionSummary = {
  reactions: { type: string; count: number; mine: boolean }[];
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
  const [summary, setSummary] = useState(providedSummary);
  const [signedIn, setSignedIn] = useState(providedSignedIn ?? false);

  useEffect(() => {
    if (providedSummary && providedSignedIn !== undefined) return;
    let cancelled = false;
    void (async () => {
      const [reactionsResponse, sessionResponse] = await Promise.all([
        fetch(`/api/articles/${slug}/reactions`),
        fetch("/api/auth/session"),
      ]);
      const next = (await reactionsResponse.json()) as ReactionSummary;
      const session = (await sessionResponse.json()) as { userId?: string };
      if (cancelled) return;
      setSummary(next);
      setSignedIn(Boolean(session.userId));
    })();
    return () => {
      cancelled = true;
    };
  }, [providedSignedIn, providedSummary, slug]);

  if (!summary) return null;

  async function press(type: string, mine: boolean) {
    if (!signedIn) {
      window.location.href = `/api/auth/signin?callbackUrl=/${slug}`;
      return;
    }
    const response = mine
      ? await fetch(`/api/articles/${slug}/reactions/${type}`, { method: "DELETE" })
      : await fetch(`/api/articles/${slug}/reactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type }),
        });
    if (!response.ok) return;
    setSummary((await (await fetch(`/api/articles/${slug}/reactions`)).json()) as ReactionSummary);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {summary.reactions.map((reaction) => (
        <button
          key={reaction.type}
          type="button"
          aria-label={t(`reaction_${reaction.type}`)}
          aria-pressed={reaction.mine}
          onClick={() => void press(reaction.type, reaction.mine)}
          className="rounded-full border border-brand/40 px-3 py-1 text-sm font-bold"
        >
          {t(`reaction_${reaction.type}`)} {reaction.count}
        </button>
      ))}
    </div>
  );
}
