import { fireEvent, render, screen } from "@testing-library/react";
import { LocaleProvider, useLocale } from "./LocaleContext";
import { ThemeProvider, useTheme } from "./ThemeContext";

function Probe() {
  const { mode, toggle } = useTheme();
  const { locale, setLocale, t } = useLocale();

  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="locale">{locale}</span>
      <span data-testid="site-name">{t("site_name")}</span>
      <button type="button" onClick={toggle}>
        toggle
      </button>
      <button type="button" onClick={() => setLocale("pt")}>
        pt
      </button>
    </div>
  );
}

function renderProbe() {
  return render(
    <ThemeProvider>
      <LocaleProvider>
        <Probe />
      </LocaleProvider>
    </ThemeProvider>,
  );
}

describe("theme and locale persistence", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("reads stored theme and locale, then persists toggle and setLocale", () => {
    localStorage.setItem("articles-theme", "light");
    localStorage.setItem("articles-locale", "es");

    renderProbe();

    expect(screen.getByTestId("mode")).toHaveTextContent("light");
    expect(screen.getByTestId("locale")).toHaveTextContent("es");
    expect(screen.getByTestId("site-name")).toHaveTextContent(
      "Artículos — Tiago Cosmai",
    );

    fireEvent.click(screen.getByRole("button", { name: "toggle" }));
    fireEvent.click(screen.getByRole("button", { name: "pt" }));

    expect(localStorage.getItem("articles-theme")).toBe("dark");
    expect(localStorage.getItem("articles-locale")).toBe("pt");
  });

  it("defaults unset theme to dark and locale from navigator.language pt-BR", () => {
    localStorage.removeItem("articles-theme");
    localStorage.removeItem("articles-locale");
    vi.spyOn(navigator, "language", "get").mockReturnValue("pt-BR");

    renderProbe();

    expect(screen.getByTestId("mode")).toHaveTextContent("dark");
    expect(screen.getByTestId("locale")).toHaveTextContent("pt");
  });
});
