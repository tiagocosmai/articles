export const PORTFOLIO_ORIGIN = "https://tiagocosmai.github.io";

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

export function articleShareUrl(slug: string, origin = portfolioShareOrigin()): string {
  return absoluteBlogHref(`/${slug}`, origin);
}

/** Articles path such as `/slug` or `/?tag=AI` on the portfolio origin. */
export function absoluteBlogHref(articlesPath: string, origin: string): string {
  const base = origin.replace(/\/$/, "");
  const queryAt = articlesPath.indexOf("?");
  const pathname = queryAt === -1 ? articlesPath : articlesPath.slice(0, queryAt);
  const search = queryAt === -1 ? "" : articlesPath.slice(queryAt);
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return `${base}/blog${search}`;
  return `${base}/blog${path.startsWith("/") ? path : `/${path}`}${search}`;
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
  return { href: absoluteBlogHref(articlesPath, origin), external: true };
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
