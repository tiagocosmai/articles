import { loadCatalog, reportCatalogErrors } from "./loadCatalog";

it("loads the secret agent article in three languages", () => {
  const content = loadCatalog();
  expect(content.errors).toEqual([]);
  expect(content.articles.map((a) => a.slug)).toEqual([
    "desenvolvedores-escravos-da-tecnologia-ia",
    "o-agente-secreto",
  ]);
  expect(content.markdown["desenvolvedores-escravos-da-tecnologia-ia.pt.md"]).toContain(
    "Aprender continuamente, por outro lado, pode ser uma forma de manter essa escolha nas nossas mãos.",
  );
  expect(content.markdown["desenvolvedores-escravos-da-tecnologia-ia.en.md"]).toContain(
    "Continuous learning, on the other hand, can be a way to keep that choice in our hands.",
  );
  expect(content.markdown["desenvolvedores-escravos-da-tecnologia-ia.es.md"]).toContain(
    "Aprender de forma continua, en cambio, puede ser una manera de mantener esa elección en nuestras manos.",
  );
  expect(
    content.flashcards["desenvolvedores-escravos-da-tecnologia-ia.pt.json"].map(
      (card) => card.id,
    ),
  ).toEqual([
    "continuous-learning",
    "management-escape",
    "ai-responsibility",
    "using-ai",
    "infinite-race",
    "useful-question",
    "slave-of-tech",
    "who-grows",
  ]);
  expect(content.markdown["o-agente-secreto.pt.md"]).toContain(
    "Autonomia pode ser delegada. Accountability não.",
  );
  expect(content.markdown["o-agente-secreto.en.md"]).toContain(
    "Autonomy can be delegated. Accountability cannot.",
  );
  expect(content.markdown["o-agente-secreto.es.md"]).toContain(
    "La autonomía se puede delegar. La responsabilidad no.",
  );
  expect(content.flashcards["o-agente-secreto.pt.json"].map((c) => c.id)).toEqual([
    "assistant-vs-agent",
    "autonomy-accountability",
    "owners",
    "risk-surface",
    "supervision",
    "code-review",
    "guardrails",
    "leadership",
    "judgment",
    "secret-agent",
  ]);
});

it("logs catalog errors", () => {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  reportCatalogErrors([{ slug: "x", message: "broken" }]);
  expect(spy).toHaveBeenCalledWith("[articles] x: broken");
  spy.mockRestore();
});
