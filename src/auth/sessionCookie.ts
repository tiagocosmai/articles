export function embeddedSessionCookie() {
  return {
    httpOnly: true,
    sameSite: "none" as const,
    path: "/",
    secure: true,
  };
}
