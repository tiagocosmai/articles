import { useLocale } from "../context/LocaleContext";
import type { Flashcard as FlashcardData } from "../types/content";
import { Flashcard } from "./Flashcard";

export function FlashcardDeck({ cards }: { cards: FlashcardData[] }) {
  const { t } = useLocale();

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-mono text-2xl leading-snug">{t("flashcards_heading")}</h2>
      <ul className="flex flex-col gap-3">
        {cards.map((card) => (
          <li key={card.id}>
            <Flashcard card={card} />
          </li>
        ))}
      </ul>
    </section>
  );
}
