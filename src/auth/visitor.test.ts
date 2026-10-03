import { isSessionId, readCookie, readSessionId, sessionIdFrom } from "./visitor";

it("reads one cookie and accepts only a session id", () => {
  const header = "theme=dark; articles-session=6f4b1c0a-6a4e-4b1d-8c3e-1a2b3c4d5e6f; articles-name=Ada%20Lovelace";
  expect(readCookie(header, "articles-name")).toBe("Ada Lovelace");
  expect(readSessionId(header)).toBe("6f4b1c0a-6a4e-4b1d-8c3e-1a2b3c4d5e6f");
  expect(readSessionId("articles-session=not-an-id")).toBeNull();
  expect(isSessionId("6f4b1c0a-6a4e-4b1d-8c3e-1a2b3c4d5e6f")).toBe(true);
  const request = new Request("https://articles.example/reactions?sessionId=6f4b1c0a-6a4e-4b1d-8c3e-1a2b3c4d5e6f");
  expect(sessionIdFrom(request)).toBe("6f4b1c0a-6a4e-4b1d-8c3e-1a2b3c4d5e6f");
  expect(sessionIdFrom(new Request("https://articles.example/reactions"), "not-an-id")).toBeNull();
});
