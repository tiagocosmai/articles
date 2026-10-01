import { describe, expect, it, vi } from "vitest";
import { copyToClipboard } from "./copyToClipboard";

describe("copyToClipboard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the clipboard API when it is available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    document.execCommand = vi.fn(() => false);

    await expect(copyToClipboard("https://tiagocosmai.github.io/blog/artigo")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("https://tiagocosmai.github.io/blog/artigo");
  });

  it("keeps the selection copy when the clipboard API rejects", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("blocked")) },
    });
    document.execCommand = vi.fn(() => true);

    await expect(copyToClipboard("texto")).resolves.toBe(true);
  });
});
