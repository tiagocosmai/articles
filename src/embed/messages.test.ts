import { describe, expect, it } from "vitest";
import {
  EMBED_CHANNEL,
  isTrustedEmbedOrigin,
  parentTargetOrigin,
  parseEmbedMessage,
} from "./messages";

describe("embed messages", () => {
  it("accepts the portfolio origin and local dev hosts", () => {
    expect(isTrustedEmbedOrigin(window.location.origin)).toBe(true);
    expect(isTrustedEmbedOrigin("http://localhost:5173")).toBe(true);
    expect(isTrustedEmbedOrigin("https://tiagocosmai.github.io")).toBe(true);
    expect(isTrustedEmbedOrigin("https://example.com")).toBe(false);
    expect(isTrustedEmbedOrigin("not a url")).toBe(false);
  });

  it("parses preferences and scroll-top, and drops malformed payloads", () => {
    expect(
      parseEmbedMessage({
        channel: EMBED_CHANNEL,
        topic: "preferences",
        locale: "es",
        theme: "light",
      }),
    ).toEqual({
      channel: EMBED_CHANNEL,
      topic: "preferences",
      locale: "es",
      theme: "light",
    });
    expect(
      parseEmbedMessage({ channel: EMBED_CHANNEL, topic: "scroll-top" }),
    ).toEqual({ channel: EMBED_CHANNEL, topic: "scroll-top" });
    expect(
      parseEmbedMessage({
        channel: EMBED_CHANNEL,
        topic: "preferences",
        locale: "fr",
        theme: "light",
      }),
    ).toBeNull();
    expect(parseEmbedMessage({ channel: "nope" })).toBeNull();
  });

  it("uses the referrer origin when the blog is embedded", () => {
    vi.spyOn(document, "referrer", "get").mockReturnValue(
      "http://localhost:5173/portfolio",
    );
    expect(parentTargetOrigin()).toBe("http://localhost:5173");
    vi.restoreAllMocks();
  });
});
