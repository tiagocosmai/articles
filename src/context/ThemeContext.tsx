import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from "react";

type ThemeMode = "dark" | "light";

type ThemeContextValue = {
  mode: ThemeMode;
  toggle: () => void;
  setMode: (mode: ThemeMode) => void;
};

const STORAGE_KEY = "articles-theme";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") {
      return stored;
    }
  } catch {
    /* ignore */
  }
  return "dark";
}

function writeTheme(mode: ThemeMode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function ThemeProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const [mode, setModeState] = useState<ThemeMode>(readTheme);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    writeTheme(next);
  }, []);

  const toggle = useCallback(() => {
    setModeState((current) => {
      const next = current === "dark" ? "light" : "dark";
      writeTheme(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ mode, toggle, setMode }),
    [mode, toggle, setMode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
