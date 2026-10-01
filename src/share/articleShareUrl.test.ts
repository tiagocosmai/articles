import { describe, expect, it, vi } from "vitest";
import {
  absoluteBlogHref,
  articleShareMessage,
  articleShareUrl,
  blogNavigationHref,
  linkedInShareHref,
  whatsAppShareHref,
} from "./articleShareUrl";

describe("article share URL", () => {
  it("points a standalone article at the portfolio blog URL", () => {
    expect(articleShareUrl("o-agente-secreto")).toBe(
      "https://tiagocosmai.github.io/blog/o-agente-secreto",
    );
  });

  it("uses the portfolio origin when the article is embedded", () => {
    vi.spyOn(window, "parent", "get").mockReturnValue({} as Window);
    vi.spyOn(document, "referrer", "get").mockReturnValue("http://127.0.0.1:5173/blog");
    expect(articleShareUrl("o-agente-secreto")).toBe(
      "http://127.0.0.1:5173/blog/o-agente-secreto",
    );
    vi.restoreAllMocks();
  });

  it("maps the articles home and an article onto /blog when embedded", () => {
    expect(absoluteBlogHref("/", "http://127.0.0.1:5173")).toBe(
      "http://127.0.0.1:5173/blog",
    );
    expect(absoluteBlogHref("/o-agente-secreto", "http://127.0.0.1:5173")).toBe(
      "http://127.0.0.1:5173/blog/o-agente-secreto",
    );
    expect(absoluteBlogHref("/?tag=AI", "https://tiagocosmai.github.io")).toBe(
      "https://tiagocosmai.github.io/blog?tag=AI",
    );
    vi.spyOn(window, "parent", "get").mockReturnValue({} as Window);
    expect(blogNavigationHref("/o-agente-secreto", "http://127.0.0.1:5173")).toEqual({
      href: "http://127.0.0.1:5173/blog/o-agente-secreto",
      external: true,
    });
    vi.restoreAllMocks();
  });

  it("builds a message with the intro, title, description, and link", () => {
    const message = articleShareMessage({
      intro: "Olha esse artigo bacana que eu encontrei...",
      title: "Título",
      description: "Descrição",
      url: "https://tiagocosmai.github.io/blog/o-agente-secreto",
    });
    expect(message).toBe(
      [
        "Olha esse artigo bacana que eu encontrei...",
        "",
        "Título",
        "",
        "Descrição",
        "",
        "https://tiagocosmai.github.io/blog/o-agente-secreto",
      ].join("\n"),
    );
    expect(linkedInShareHref(message)).toContain(encodeURIComponent(message));
    expect(whatsAppShareHref(message)).toContain(encodeURIComponent(message));
  });
});
