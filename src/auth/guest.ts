export type GuestContact = { name: string; email: string };

export function guestContact(name: unknown, email: unknown): GuestContact | null {
  if (typeof name !== "string" || typeof email !== "string") return null;
  const trimmedName = name.trim().replace(/\s+/g, " ");
  const trimmedEmail = email.trim().toLowerCase();
  if (trimmedName.length < 1 || trimmedName.length > 80) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail) || trimmedEmail.length > 200) return null;
  return { name: trimmedName, email: trimmedEmail };
}

const guestKey = "articles-guest";

export function readGuestContact(): GuestContact | null {
  try {
    const raw = sessionStorage.getItem(guestKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { name?: unknown; email?: unknown };
    return guestContact(parsed.name, parsed.email);
  } catch {
    return null;
  }
}

export function writeGuestContact(contact: GuestContact) {
  sessionStorage.setItem(guestKey, JSON.stringify(contact));
}
