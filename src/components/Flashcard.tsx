import { useState } from "react";
import { useLocale } from "../context/LocaleContext";
import { useTheme } from "../context/ThemeContext";
import type { Flashcard as FlashcardData } from "../types/content";

export function Flashcard({ card }: { card: FlashcardData }) {
  const { t } = useLocale();
  const { mode } = useTheme();
  const [showBack, setShowBack] = useState(false);
  const border = mode === "dark" ? "border-white/15" : "border-black/10";
  const surface = mode === "dark" ? "bg-white/5" : "bg-white";

  return (
    <button
      type="button"
      aria-pressed={showBack}
      aria-label={showBack ? t("flip_to_front") : t("flip_to_back")}
      onClick={() => setShowBack((current) => !current)}
      className={`w-full rounded-lg border px-4 py-4 text-left leading-relaxed ${border} ${surface}`}
    >
      {showBack ? card.back : card.front}
    </button>
  );
}
