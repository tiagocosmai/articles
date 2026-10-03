const sessionCookie = "articles-session";
const nameCookie = "articles-name";
const emailCookie = "articles-email";
const cookieLifetime = 60 * 60 * 24 * 400;

export function isSessionId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const index = trimmed.indexOf("=");
    if (index === -1 || trimmed.slice(0, index) !== name) continue;
    try {
      return decodeURIComponent(trimmed.slice(index + 1));
    } catch {
      return null;
    }
  }
  return null;
}

export function readSessionId(header: string | null): string | null {
  const value = readCookie(header, sessionCookie);
  return value && isSessionId(value) ? value : null;
}

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${cookieLifetime}; SameSite=Lax`;
}

export function ensureSessionId(): string {
  const current = readSessionId(document.cookie);
  if (current) return current;
  const created = crypto.randomUUID();
  writeCookie(sessionCookie, created);
  return created;
}

export function readVisitorContact(): { name: string; email: string } {
  return {
    name: readCookie(document.cookie, nameCookie) ?? "",
    email: readCookie(document.cookie, emailCookie) ?? "",
  };
}

export function writeVisitorContact(name: string, email: string) {
  writeCookie(nameCookie, name);
  writeCookie(emailCookie, email);
}
