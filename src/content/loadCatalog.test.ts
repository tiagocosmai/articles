import { loadCatalog, reportCatalogErrors } from "./loadCatalog";

it("loads the secret agent article in three languages", () => {
  const content = loadCatalog();
  expect(content.errors).toEqual([]);
  expect(content.articles.map((a) => a.slug)).toEqual(["o-agente-secreto"]);
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
