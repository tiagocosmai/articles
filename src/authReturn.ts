import { PORTFOLIO_ORIGIN } from "./share/articleShareUrl";

const LOCAL_PORTFOLIO = ["http://localhost:5173", "http://127.0.0.1:5173"];

export function authReturnUrl(url: string, baseUrl: string): string {
  if (url.startsWith("/")) return `${baseUrl}${url}`;
  try {
    const target = new URL(url);
    const allowed = new Set([new URL(baseUrl).origin, PORTFOLIO_ORIGIN, ...LOCAL_PORTFOLIO]);
    if (allowed.has(target.origin)) return url;
  } catch {
    /* Reject anything that is not a URL. */
  }
  return baseUrl;
}
