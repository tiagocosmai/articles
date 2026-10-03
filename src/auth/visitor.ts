const sessionKey = "articles-session";
const nameKey = "articles-name";
const emailKey = "articles-email";
const sessionCookie = sessionKey;
const nameCookie = nameKey;
const emailCookie = emailKey;
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

export function sessionIdFrom(request: Request, explicit?: string | null): string | null {
  if (explicit && isSessionId(explicit)) return explicit;
  const fromQuery = new URL(request.url).searchParams.get("sessionId");
  if (fromQuery && isSessionId(fromQuery)) return fromQuery;
  return readSessionId(request.headers.get("cookie"));
}

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${cookieLifetime}; SameSite=Lax`;
}

export function ensureSessionId(): string {
  try {
    const stored = localStorage.getItem(sessionKey);
    if (stored && isSessionId(stored)) return stored;
  } catch {
    // Private mode can block localStorage. The cookie below still identifies the reader.
  }
  const fromCookie = readSessionId(document.cookie);
  const created = fromCookie ?? crypto.randomUUID();
  try {
    localStorage.setItem(sessionKey, created);
  } catch {
    writeCookie(sessionCookie, created);
  }
  return created;
}

export function readVisitorContact(): { name: string; email: string } {
  try {
    const name = localStorage.getItem(nameKey);
    const email = localStorage.getItem(emailKey);
    if (name || email) return { name: name ?? "", email: email ?? "" };
  } catch {
    // Fall through to the cookie copy.
  }
  return {
    name: readCookie(document.cookie, nameCookie) ?? "",
    email: readCookie(document.cookie, emailCookie) ?? "",
  };
}

export function writeVisitorContact(name: string, email: string) {
  try {
    localStorage.setItem(nameKey, name);
    localStorage.setItem(emailKey, email);
  } catch {
    // The cookie still keeps the contact when storage is blocked.
  }
  writeCookie(nameCookie, name);
  writeCookie(emailCookie, email);
}
