import { act, render } from "@testing-library/react";
import { LocaleProvider } from "../context/LocaleContext";
import { ThemeProvider } from "../context/ThemeContext";
import { EMBED_CHANNEL } from "./messages";
import { useEmbedBridge } from "./useEmbedBridge";

function Probe() {
  useEmbedBridge();
  return null;
}

describe("embed scroll reports", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts the document scroll offset to the parent frame", async () => {
    const postMessage = vi.fn();
    vi.spyOn(window, "parent", "get").mockReturnValue({ postMessage } as unknown as Window);
    vi.spyOn(window, "scrollY", "get").mockReturnValue(400);

    render(
      <ThemeProvider>
        <LocaleProvider>
          <Probe />
        </LocaleProvider>
      </ThemeProvider>,
    );

    await act(async () => {
      document.dispatchEvent(new Event("scroll"));
      await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
    });

    expect(postMessage).toHaveBeenCalledWith(
      { channel: EMBED_CHANNEL, topic: "scroll", scrollY: 400 },
      "*",
    );
  });
});
