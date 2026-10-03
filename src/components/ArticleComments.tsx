"use client";

import { useEffect, useState } from "react";
import { useLocale } from "../context/LocaleContext";
import { useTheme } from "../context/ThemeContext";
import { guestContact } from "../auth/guest";
import { ensureSessionId, readVisitorContact, writeVisitorContact } from "../auth/visitor";

const maxBodyLength = 1000;

type CommentItem = {
  id: string;
  body: string;
  status: "pending" | "approved" | "rejected";
  parentId: string | null;
  userName: string;
  createdAt: string;
  mine: boolean;
};

const dateLocales = { pt: "pt-BR", en: "en", es: "es" } as const;

export function ArticleComments({ slug }: { slug: string }) {
  const { locale, t } = useLocale();
  const { mode } = useTheme();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [pendingNotice, setPendingNotice] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [invalid, setInvalid] = useState(false);

  function commentsUrl() {
    const sessionId = ensureSessionId();
    return `/api/articles/${slug}/comments?sessionId=${encodeURIComponent(sessionId)}`;
  }

  async function load() {
    const commentsResponse = await fetch(commentsUrl());
    const payload = (await commentsResponse.json()) as { comments?: CommentItem[] };
    setComments(Array.isArray(payload.comments) ? payload.comments : []);
  }

  useEffect(() => {
    const contact = readVisitorContact();
    setName(contact.name);
    setEmail(contact.email);
    ensureSessionId();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const commentsResponse = await fetch(commentsUrl());
        const payload = (await commentsResponse.json()) as { comments?: CommentItem[] };
        if (!cancelled) setComments(Array.isArray(payload.comments) ? payload.comments : []);
      } catch {
        if (!cancelled) setComments([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function send(body: string, parentId: string | null) {
    const contact = guestContact(name, email);
    if (!contact) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    writeVisitorContact(contact.name, contact.email);
    const sessionId = ensureSessionId();
    const text = body.trim();
    if (!text || text.length > maxBodyLength) return;
    const response = await fetch(`/api/articles/${slug}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text, parentId, name: contact.name, email: contact.email, sessionId }),
    });
    if (!response.ok) return;
    const created = (await response.json()) as CommentItem;
    if (parentId) {
      setReplyDraft("");
      setReplyTo(null);
    } else {
      setDraft("");
    }
    await load();
    if (created.status === "pending") {
      setPendingNotice(true);
      setComments((current) => (current.some((item) => item.id === created.id) ? current : [...current, created]));
    }
  }

  const border = mode === "dark" ? "border-brand/40" : "border-brand-light/40";
  const topLevel = comments.filter((comment) => comment.parentId === null);
  const repliesOf = (id: string) => comments.filter((comment) => comment.parentId === id);
  const orphans = comments.filter(
    (comment) => comment.parentId !== null && !comments.some((parent) => parent.id === comment.parentId),
  );

  return (
    <section aria-label={t("comments_heading")} className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">{t("comments_heading")}</h2>
      <CommentComposer
        label={t("comments_placeholder")}
        value={draft}
        onChange={setDraft}
        onSubmit={() => void send(draft, null)}
        submitLabel={t("login_guest_submit")}
        remainingLabel={t("comments_remaining")}
        border={border}
        name={name}
        email={email}
        nameLabel={t("login_guest_name")}
        emailLabel={t("login_guest_email")}
        onName={(value) => {
          setName(value);
          writeVisitorContact(value, email);
        }}
        onEmail={(value) => {
          setEmail(value);
          writeVisitorContact(name, value);
        }}
        invalid={invalid ? t("login_guest_invalid") : ""}
      />
      {topLevel.length === 0 && orphans.length === 0 ? <p>{t("comments_empty")}</p> : null}
      <ul className="flex flex-col gap-4">
        {[...topLevel, ...orphans].map((comment) => (
          <li key={comment.id} className="flex flex-col gap-3">
            <CommentBody comment={comment} locale={locale} pendingLabel={t("comments_pending")} />
            {comment.parentId === null && repliesOf(comment.id).length > 0 ? (
              <ul className="flex flex-col gap-3 border-l border-white/10 pl-4">
                {repliesOf(comment.id).map((reply) => (
                  <li key={reply.id}>
                    <CommentBody comment={reply} locale={locale} pendingLabel={t("comments_pending")} />
                  </li>
                ))}
              </ul>
            ) : null}
            {comment.parentId === null && replyTo === comment.id ? (
              <CommentComposer
                label={t("comments_reply_placeholder")}
                value={replyDraft}
                onChange={setReplyDraft}
                onSubmit={() => void send(replyDraft, comment.id)}
                submitLabel={t("login_guest_submit")}
                remainingLabel={t("comments_remaining")}
                border={border}
              />
            ) : null}
            {comment.parentId === null && replyTo !== comment.id ? (
              <button type="button" onClick={() => setReplyTo(comment.id)} className="w-fit text-sm font-bold">
                {t("comments_reply")}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {pendingNotice ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="comment-moderation"
            className={`max-w-md rounded-lg border bg-[#121816] p-4 text-white ${border}`}
          >
            <p id="comment-moderation">{t("comment_pending_notice")}</p>
            <button
              type="button"
              onClick={() => setPendingNotice(false)}
              className={`mt-4 rounded-full border px-3 py-1 font-bold ${border}`}
            >
              {t("comment_pending_close")}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function CommentBody({
  comment,
  locale,
  pendingLabel,
}: {
  comment: CommentItem;
  locale: "pt" | "en" | "es";
  pendingLabel: string;
}) {
  const when = new Intl.DateTimeFormat(dateLocales[locale], {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(comment.createdAt));
  return (
    <article className="flex flex-col gap-1">
      <p className="text-sm font-bold">
        {comment.userName} <time dateTime={comment.createdAt}>{when}</time>
      </p>
      {comment.status === "pending" ? <p className="text-sm opacity-80">{pendingLabel}</p> : null}
      <p className="whitespace-pre-wrap">{comment.body}</p>
    </article>
  );
}

function CommentComposer({
  label,
  value,
  onChange,
  onSubmit,
  submitLabel,
  remainingLabel,
  border,
  name,
  email,
  nameLabel,
  emailLabel,
  onName,
  onEmail,
  invalid,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  submitLabel: string;
  remainingLabel: string;
  border: string;
  name?: string;
  email?: string;
  nameLabel?: string;
  emailLabel?: string;
  onName?: (value: string) => void;
  onEmail?: (value: string) => void;
  invalid?: string;
}) {
  const remaining = maxBodyLength - value.length;
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      {nameLabel && emailLabel && onName && onEmail ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span>{nameLabel}</span>
            <input
              aria-label={nameLabel}
              placeholder={nameLabel}
              value={name ?? ""}
              onChange={(event) => onName(event.target.value)}
              className={`w-full rounded-md border bg-transparent px-3 py-2 placeholder:text-current placeholder:opacity-60 ${border}`}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>{emailLabel}</span>
            <input
              aria-label={emailLabel}
              type="email"
              placeholder={emailLabel}
              value={email ?? ""}
              onChange={(event) => onEmail(event.target.value)}
              className={`w-full rounded-md border bg-transparent px-3 py-2 placeholder:text-current placeholder:opacity-60 ${border}`}
            />
          </label>
        </div>
      ) : null}
      {invalid ? <p>{invalid}</p> : null}
      <textarea
        aria-label={label}
        placeholder={label}
        maxLength={maxBodyLength}
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-md border bg-transparent px-3 py-2 placeholder:text-current placeholder:opacity-60 ${border}`}
      />
      <div className="flex items-center justify-between gap-3 text-sm">
        <p aria-live="polite">{remainingLabel.replace("{count}", String(remaining))}</p>
        <button type="submit" className={`rounded-full border px-3 py-1 font-bold ${border}`}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
