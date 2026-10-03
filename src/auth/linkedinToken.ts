const tokenEndpoint = "https://www.linkedin.com/oauth/v2/accessToken";

export function linkedinTokenBody(body: URLSearchParams): string {
  const secret = body.get("client_secret");
  const rest = new URLSearchParams(body);
  rest.delete("client_secret");
  rest.delete("code_verifier");
  const prefix = rest.toString();
  if (!secret) return prefix;
  const field = `client_secret=${encodeURIComponent(secret).replace(/%3D/g, "=")}`;
  return prefix ? `${prefix}&${field}` : field;
}

export function linkedinTokenFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (!url.startsWith(tokenEndpoint) || !(init?.body instanceof URLSearchParams)) {
    return fetch(input, init);
  }
  return fetch(input, { ...init, body: linkedinTokenBody(init.body) }).then(async (response) => {
    if (response.ok) return response;
    const details = (await response.clone().json().catch(() => null)) as { error?: string } | null;
    if (details?.error === "invalid_client") {
      console.error("[auth] linkedin credential lengths", {
        id: process.env.LINKEDIN_ID?.length ?? 0,
        secret: process.env.LINKEDIN_SECRET?.length ?? 0,
      });
    }
    return response;
  });
}
