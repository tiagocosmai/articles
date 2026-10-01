import { useEffect } from "react";
import { useLocale } from "../context/LocaleContext";
import { useTheme } from "../context/ThemeContext";
import { rememberPortfolioOrigin } from "../share/articleShareUrl";
import {
  isTrustedEmbedOrigin,
  parseEmbedMessage,
  readEmbedScrollOffset,
  scrollReport,
} from "./messages";

export function useEmbedBridge() {
  const { setLocale } = useLocale();
  const { setMode } = useTheme();

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!isTrustedEmbedOrigin(event.origin)) return;
      const message = parseEmbedMessage(event.data);
      if (!message) return;
      if (message.topic === "preferences") {
        setLocale(message.locale);
        setMode(message.theme);
        if (message.origin) rememberPortfolioOrigin(message.origin);
        return;
      }
      if (message.topic === "scroll-top") {
        window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [setLocale, setMode]);

  useEffect(() => {
    if (window.parent === window) return;
    let frame = 0;
    const notify = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        window.parent.postMessage(scrollReport(readEmbedScrollOffset()), "*");
      });
    };
    const options = { passive: true, capture: true } as const;
    document.addEventListener("scroll", notify, options);
    window.addEventListener("scroll", notify, options);
    notify();
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("scroll", notify, options);
      window.removeEventListener("scroll", notify, options);
    };
  }, []);
}
