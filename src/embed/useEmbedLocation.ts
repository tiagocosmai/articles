import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  isTrustedEmbedOrigin,
  locationReport,
  parseEmbedMessage,
} from "./messages";

export function useEmbedLocation() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (window.parent === window) return;
    window.parent.postMessage(
      locationReport(location.pathname, location.search),
      "*",
    );
  }, [location.pathname, location.search]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!isTrustedEmbedOrigin(event.origin)) return;
      const message = parseEmbedMessage(event.data);
      if (!message || message.topic !== "navigate") return;
      const current = `${location.pathname}${location.search}`;
      if (message.path === current) return;
      navigate(message.path);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [location.pathname, location.search, navigate]);
}
