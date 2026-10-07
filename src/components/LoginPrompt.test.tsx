import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocaleProvider } from "../context/LocaleContext";
import { LoginPrompt } from "./LoginPrompt";

it("closes the login once the popup session is visible", async () => {
  localStorage.setItem("articles-locale", "pt");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo) => {
      const url = String(input);
      if (url.includes("/api/auth/session")) return { json: async () => ({ userId: "admin-1" }) };
      return { json: async () => ({ methods: [{ id: "github" }, { id: "gmail" }] }) };
    }),
  );
  vi.stubGlobal("open", vi.fn(() => ({ closed: false })));
  const onSignedIn = vi.fn();
  render(
    <LocaleProvider>
      <LoginPrompt open slug="admin" onClose={() => {}} onSignedIn={onSignedIn} onGuest={() => {}} />
    </LocaleProvider>,
  );

  await userEvent.click(screen.getByRole("button", { name: "Continuar com GitHub" }));

  await waitFor(() => expect(onSignedIn).toHaveBeenCalled());
});
