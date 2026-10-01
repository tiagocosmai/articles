import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { EMBED_CHANNEL } from "./messages";
import { useEmbedLocation } from "./useEmbedLocation";

function Probe() {
  useEmbedLocation();
  const location = useLocation();
  return <div>{`${location.pathname}${location.search}`}</div>;
}

describe("embed location", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("tells the portfolio which article is open", () => {
    const postMessage = vi.fn();
    vi.spyOn(window, "parent", "get").mockReturnValue({ postMessage } as unknown as Window);

    render(
      <MemoryRouter initialEntries={["/o-agente-secreto"]}>
        <Probe />
      </MemoryRouter>,
    );

    expect(postMessage).toHaveBeenCalledWith(
      {
        channel: EMBED_CHANNEL,
        topic: "location",
        pathname: "/o-agente-secreto",
        search: "",
      },
      "*",
    );
  });

  it("follows a navigate message from the portfolio", () => {
    render(
      <MemoryRouter initialEntries={["/o-agente-secreto"]}>
        <Probe />
      </MemoryRouter>,
    );

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "http://localhost:5173",
          data: { channel: EMBED_CHANNEL, topic: "navigate", path: "/" },
        }),
      );
    });

    expect(screen.getByText("/")).toBeInTheDocument();
  });
});
