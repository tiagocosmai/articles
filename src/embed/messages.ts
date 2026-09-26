export const EMBED_CHANNEL = "tiagocosmai-embed";

export type EmbedLocale = "pt" | "en" | "es";
export type EmbedTheme = "dark" | "light";

export type EmbedMessage =
  | {
      channel: typeof EMBED_CHANNEL;
      topic: "preferences";
      locale: EmbedLocale;
      theme: EmbedTheme;
    }
  | { channel: typeof EMBED_CHANNEL; topic: "scroll-top" }
  | { channel: typeof EMBED_CHANNEL; topic: "scroll"; scrollY: number };

const LOCALES = new Set<EmbedLocale>(["pt", "en", "es"]);
const THEMES = new Set<EmbedTheme>(["dark", "light"]);

export function isTrustedEmbedOrigin(origin: string): boolean {
  if (origin === window.location.origin) return true;
  try {
    const url = new URL(origin);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return true;
    if (url.origin === "https://tiagocosmai.github.io") return true;
  } catch {
    return false;
  }
  return false;
}

export function parseEmbedMessage(data: unknown): EmbedMessage | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  if (record.channel !== EMBED_CHANNEL) return null;
  if (record.topic === "scroll-top") {
    return { channel: EMBED_CHANNEL, topic: "scroll-top" };
  }
  if (record.topic === "preferences") {
    if (typeof record.locale !== "string" || !LOCALES.has(record.locale as EmbedLocale)) {
      return null;
    }
    if (typeof record.theme !== "string" || !THEMES.has(record.theme as EmbedTheme)) {
      return null;
    }
    return {
      channel: EMBED_CHANNEL,
      topic: "preferences",
      locale: record.locale as EmbedLocale,
      theme: record.theme as EmbedTheme,
    };
  }
  return null;
}

export function parentTargetOrigin(): string {
  try {
    if (document.referrer) return new URL(document.referrer).origin;
  } catch {
    /* ignore */
  }
  return "*";
}

export function scrollReport(scrollY: number) {
  return { channel: EMBED_CHANNEL, topic: "scroll" as const, scrollY };
}

export function readEmbedScrollOffset(): number {
  const root = document.scrollingElement;
  return Math.max(
    window.scrollY || 0,
    document.documentElement?.scrollTop || 0,
    document.body?.scrollTop || 0,
    root?.scrollTop || 0,
  );
}
