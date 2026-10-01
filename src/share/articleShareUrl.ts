import type { Locale } from "../types/content";

export const PORTFOLIO_ORIGIN = "https://tiagocosmai.github.io";

export function portfolioLocalePrefix(locale: Locale = "pt"): string {
  return `/${locale}`;
}

export function portfolioShareOrigin(): string {
  if (window.parent !== window) {
    try {
      if (document.referrer) return new URL(document.referrer).origin;
    } catch {
      /* Use the public portfolio. */
    }
  }
  return PORTFOLIO_ORIGIN;
}

export function articleShareUrl(
  slug: string,
  origin = portfolioShareOrigin(),
  locale: Locale = "pt",
): string {
  return absoluteBlogHref(`/${slug}`, origin, locale);
}

/** Articles path such as `/slug` or `/?tag=AI` on the portfolio origin. */
export function absoluteBlogHref(
  articlesPath: string,
  origin: string,
  locale: Locale = "pt",
): string {
  const base = origin.replace(/\/$/, "");
  const queryAt = articlesPath.indexOf("?");
  const pathname = queryAt === -1 ? articlesPath : articlesPath.slice(0, queryAt);
  const search = queryAt === -1 ? "" : articlesPath.slice(queryAt);
  const path = pathname.replace(/\/+$/, "") || "/";
  const prefix = portfolioLocalePrefix(locale);
  if (path === "/") return `${base}${prefix}/blog${search}`;
  return `${base}${prefix}/blog${path.startsWith("/") ? path : `/${path}`}${search}`;
}

let rememberedPortfolioOrigin = "";
const originListeners = new Set<() => void>();

export function rememberPortfolioOrigin(origin: string) {
  if (!origin || origin === rememberedPortfolioOrigin) return;
  rememberedPortfolioOrigin = origin;
  originListeners.forEach((listener) => listener());
}

export function subscribePortfolioOrigin(listener: () => void) {
  originListeners.add(listener);
  return () => originListeners.delete(listener);
}

export function portfolioOriginSnapshot() {
  return rememberedPortfolioOrigin;
}

export function blogNavigationHref(
  articlesPath: string,
  portfolioOrigin = rememberedPortfolioOrigin,
  locale: Locale = "pt",
): { href: string; external: boolean } {
  if (window.parent === window) {
    return { href: articlesPath, external: false };
  }
  let origin = portfolioOrigin;
  if (!origin) {
    try {
      if (document.referrer) origin = new URL(document.referrer).origin;
    } catch {
      origin = "";
    }
  }
  if (!origin) origin = PORTFOLIO_ORIGIN;
  return { href: absoluteBlogHref(articlesPath, origin, locale), external: true };
}

export function articleShareMessage(input: {
  intro: string;
  title: string;
  description: string;
  url: string;
}): string {
  return `${input.intro}\n\n${input.title}\n\n${input.description}\n\n${input.url}`;
}

export function linkedInShareHref(message: string): string {
  return `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(message)}`;
}

export function whatsAppShareHref(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
