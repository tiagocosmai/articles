export function storageAccessResponseHeaders(input: {
  access: string | null;
  destination: string | null;
  method: string;
}): Record<string, string> | null {
  if (input.method !== "GET") return null;
  if (input.destination !== "document" && input.destination !== "empty") return null;
  const vary = { Vary: "Sec-Fetch-Storage-Access" };
  if (input.access === "inactive") {
    return { "Activate-Storage-Access": "retry; allowed-origin=*", ...vary };
  }
  if (input.access === "active") {
    return { "Activate-Storage-Access": "load", ...vary };
  }
  return null;
}
