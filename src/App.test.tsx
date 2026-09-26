import { act, render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("renders the app shell without its own header or footer", () => {
    render(<App />);
    expect(screen.getByTestId("app-shell")).toBeInTheDocument();
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  });

  it("applies locale and theme from the portfolio and scrolls to the top on request", () => {
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo;
    render(<App />);

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "https://evil.example",
          data: {
            channel: "tiagocosmai-embed",
            topic: "preferences",
            locale: "es",
            theme: "light",
          },
        }),
      );
    });
    expect(screen.getByTestId("app-shell")).toHaveAttribute("data-theme", "dark");

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: window.location.origin,
          data: {
            channel: "tiagocosmai-embed",
            topic: "preferences",
            locale: "es",
            theme: "light",
          },
        }),
      );
    });
    expect(screen.getByTestId("app-shell")).toHaveAttribute("data-theme", "light");
    expect(document.documentElement.lang).toBe("es");

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: window.location.origin,
          data: { channel: "tiagocosmai-embed", topic: "scroll-top" },
        }),
      );
    });
    expect(scrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  });
});
