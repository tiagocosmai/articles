# Articles Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a static React site that lists articles from `data/articles.json` and renders each article plus its flashcards in Portuguese, English, and Spanish.

**Architecture:** Vite loads markdown and flashcard JSON with `import.meta.glob`. `validateCatalog` drops invalid entries. The home page filters the accepted list by text, exact date, and tags. `/articles/:slug` renders the active locale's markdown and flip cards. Theme and locale persist in `localStorage`.

**Tech Stack:** React 19, Vite 6, TypeScript, Tailwind 3, React Router 7, react-markdown, remark-gfm, Vitest, Testing Library.

## Global Constraints

- Dark background `#030806`, light background `#f0fdf7`, dark text `#ffffff`, light text `#0d1116`, dark accent `#00FF41`, light accent `#0e7a32`.
- Fonts: Lato and Courier Prime.
- Vite `base` is `/`. No deploy script.
- `articles-theme` is `dark` or `light`; missing or invalid means `dark`.
- `articles-locale` is `pt`, `en`, or `es`; missing or invalid follows `navigator.language` (`pt`, then `es`, otherwise `en`).
- Document titles: `Artigos — Tiago Cosmai`, `Articles — Tiago Cosmai`, `Artículos — Tiago Cosmai`. `lang` is `pt-BR`, `en`, or `es`.
- Reading column is `max-w-3xl`.
- Date filter is exact `YYYY-MM-DD`. Tags combine with AND. Text search is case-insensitive on the active locale title and description.
- Do not render raw HTML from markdown. Do not fall back to another locale.
- Footer links to `https://tiagocosmai.github.io/`.
- Out of scope: deploy, comments, auth, editor, quiz scoring, hierarchical tags, RSS.

## File map

- `src/types/content.ts` — `Locale`, `Article`, `Flashcard`, `ContentFiles`, `CatalogError`, `LoadedContent`, `ArticleFilters`
- `src/content/validateCatalog.ts` — reject bad catalog rows
- `src/content/filterArticles.ts` — `filterArticles`, `formatArticleDate`, `collectTags`
- `src/content/loadCatalog.ts` — glob files, validate, `reportCatalogErrors`
- `src/i18n/ui.ts` — interface strings
- `src/context/ThemeContext.tsx`, `src/context/LocaleContext.tsx`
- `src/components/Flags.tsx` — copied from the portfolio
- `src/components/Header.tsx`, `Footer.tsx`, `ArticleCard.tsx`, `ArticleFilters.tsx`, `ArticleList.tsx`, `Flashcard.tsx`, `FlashcardDeck.tsx`, `MarkdownBody.tsx`
- `src/pages/HomePage.tsx`, `ArticlePage.tsx`, `NotFoundPage.tsx`
- `data/articles.json` and `data/articles/o-agente-secreto.{pt,en,es}.{md,json}`

---

### Task 1: Scaffold

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `postcss.config.js`, `tailwind.config.js`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/vite-env.d.ts`, `src/setupTests.ts`, `src/App.test.tsx`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: none
- Produces: `npm test` and `npm run build` scripts; `App` renders `data-testid="app-shell"`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("renders the app shell", () => {
    render(<App />);
    expect(screen.getByTestId("app-shell")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/App.test.tsx`

Expected: FAIL because the project and `App` do not exist yet.

- [ ] **Step 3: Write the scaffold**

`package.json`:

```json
{
  "name": "articles",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-markdown": "^10.1.0",
    "react-router-dom": "^7.6.2",
    "remark-gfm": "^4.0.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.2.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/react": "^19.0.10",
    "@types/react-dom": "^19.0.4",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "jsdom": "^26.0.0",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "~5.8.2",
    "vite": "^6.2.2",
    "vitest": "^3.0.9"
  }
}
```

`vite.config.ts`:

```ts
/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  base: "/",
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.ts",
  },
});
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client", "vitest/globals"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

`tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler"
  },
  "include": ["vite.config.ts"]
}
```

`postcss.config.js`:

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

`tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "#00FF41",
        "brand-light": "#0e7a32",
        ink: "#0d1116",
        surface: { dark: "#030806", light: "#f0fdf7" },
      },
      fontFamily: {
        sans: ["Lato", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"Courier Prime"', "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
```

`index.html` uses the same Google Fonts link as the portfolio (`Lato` and `Courier Prime`), `lang="en"`, viewport, and `<script type="module" src="/src/main.tsx">`. Title placeholder: `Artigos — Tiago Cosmai`.

`src/setupTests.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

`src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />
```

`src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

.article-body h1 { @apply mb-4 font-mono text-3xl leading-tight; }
.article-body h2 { @apply mb-3 mt-8 font-mono text-2xl leading-snug; }
.article-body p { @apply mb-4 leading-relaxed; }
.article-body ul { @apply mb-4 list-disc pl-6; }
.article-body ol { @apply mb-4 list-decimal pl-6; }
.article-body a { @apply underline; }
.article-body strong { @apply font-bold; }
.article-body table { @apply mb-4 w-full border-collapse text-left text-sm; }
.article-body th, .article-body td { @apply border border-current/20 px-2 py-1 align-top; }
```

`src/main.tsx` renders `App` in `StrictMode`.

`src/App.tsx`:

```tsx
export default function App() {
  return <div data-testid="app-shell">Artigos</div>;
}
```

Append `/dist` to `.gitignore`.

Run `npm install`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/App.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vite.config.ts tsconfig.json tsconfig.node.json postcss.config.js tailwind.config.js index.html src .gitignore
git commit -m "Scaffold the Vite app so tests can run."
```

---

### Task 2: Catalog validation

**Files:**
- Create: `src/types/content.ts`, `src/content/validateCatalog.ts`, `src/content/validateCatalog.test.ts`

**Interfaces:**
- Consumes: none
- Produces:

```ts
export type Locale = "pt" | "en" | "es";

export type ArticleLocale = {
  title: string;
  description: string;
  markdown: string;
};

export type Article = {
  slug: string;
  date: string;
  tags: string[];
  locales: Record<Locale, ArticleLocale>;
};

export type Flashcard = { id: string; front: string; back: string };

export type ContentFiles = {
  markdown: Record<string, string>;
  flashcards: Record<string, { cards: Flashcard[] } | unknown>;
};

export type CatalogError = { slug: string; message: string };

export function validateCatalog(
  raw: unknown,
  files: ContentFiles,
): { articles: Article[]; errors: CatalogError[] };
```

- [ ] **Step 1: Write the failing test**

Cover these cases in `validateCatalog.test.ts`:

- A complete item with files present is accepted.
- An item missing `locales.en.title` is rejected and absent from `articles`.
- `date: "2026-02-31"` is rejected.
- Two items with the same slug: only the first is accepted; the second error mentions duplicate.
- Markdown filename not in `files.markdown` is rejected.
- Flashcard file missing, `cards` missing, empty `cards`, blank `front`, or duplicate card `id` is rejected.
- A tag containing `#`, a space, or a duplicate inside the item is rejected.
- Slug `O-Agente` is rejected. Slug must match `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`.

Use a helper `filesFor(name)` that maps `` `${name}.pt.md` ``, `.en.md`, `.es.md` to `"# hi"` and the matching `.json` files to one card `{ id: "a", front: "f", back: "b" }`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/content/validateCatalog.test.ts`

Expected: FAIL with module not found.

- [ ] **Step 3: Write minimal implementation**

`validateCatalog` accepts `{ articles: unknown[] }` only. For each row, collect one error and continue. First valid slug wins. Every locale of an accepted row must have non-empty `title`, `description`, and `markdown` filename. That filename must exist in `files.markdown`. The flashcard filename is the markdown name with `.md` replaced by `.json`, and it must contain a non-empty `cards` array of unique non-empty `id` / `front` / `back`. `date` must be a real `YYYY-MM-DD` calendar date (check UTC year, month, day). Tags are a non-empty list of strings with no `#`, no whitespace, and no in-item duplicates. Preserve accepted order.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/content/validateCatalog.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types/content.ts src/content/validateCatalog.ts src/content/validateCatalog.test.ts
git commit -m "Reject incomplete article catalog entries before they reach the UI."
```

---

### Task 3: Filters and dates

**Files:**
- Create: `src/content/filterArticles.ts`, `src/content/filterArticles.test.ts`

**Interfaces:**
- Consumes: `Article`, `Locale` from `src/types/content.ts`
- Produces:

```ts
export type ArticleFilters = { query: string; date: string; tags: string[] };

export function filterArticles(
  articles: Article[],
  locale: Locale,
  filters: ArticleFilters,
): Article[];

export function formatArticleDate(isoDate: string, locale: Locale): string;

export function collectTags(articles: Article[]): string[];
```

- [ ] **Step 1: Write the failing test**

Articles `b` (`2026-09-01`) and `a` (`2026-09-24`), both with pt/en/es titles containing `Alpha` or `Beta`.

- Empty filters return `a` then `b` (date desc, slug asc).
- Query `beta` matches only the Beta title, case-insensitive, active locale only.
- `date: "2026-09-01"` returns only `b`.
- `tags: ["AI"]` returns articles that have `AI`.
- `tags: ["AI", "Lideranca"]` returns only articles that have both.
- Query `zzz` returns `[]`.
- `formatArticleDate("2026-09-24", "pt")` is `24 de setembro de 2026`.
- `collectTags` returns first-seen tag order across articles.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/content/filterArticles.test.ts`

Expected: FAIL with module not found.

- [ ] **Step 3: Write minimal implementation**

Build the calendar date with `new Date(year, monthIndex, day)` so the day does not shift. Format with `Intl.DateTimeFormat` and locale `pt-BR`, `en`, or `es`, options `{ day: "numeric", month: "long", year: "numeric" }`. `collectTags` walks articles then tags and skips ones already seen.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/content/filterArticles.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/content/filterArticles.ts src/content/filterArticles.test.ts
git commit -m "Filter articles by text, date, and tags."
```

---

### Task 4: Theme and locale

**Files:**
- Create: `src/i18n/ui.ts`, `src/context/ThemeContext.tsx`, `src/context/LocaleContext.tsx`, `src/context/persistence.test.tsx`

**Interfaces:**
- Consumes: `Locale`
- Produces:

```ts
export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element;
export function useTheme(): { mode: "dark" | "light"; toggle: () => void };

export function LocaleProvider({ children }: { children: ReactNode }): JSX.Element;
export function useLocale(): {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
};
```

UI keys, exactly: `site_name`, `theme_to_light`, `theme_to_dark`, `search_label`, `search_placeholder`, `date_label`, `tags_label`, `empty_results`, `flip_to_back`, `flip_to_front`, `not_found_title`, `not_found_body`, `back_home`, `missing_content`, `flashcards_heading`, `footer_portfolio`, `lang_select_aria`.

Portuguese `site_name` is `Artigos — Tiago Cosmai`. English is `Articles — Tiago Cosmai`. Spanish is `Artículos — Tiago Cosmai`. `footer_portfolio` is `Portfólio` / `Portfolio` / `Portafolio`. `empty_results` says no articles match. `missing_content` says this language file is unavailable. `not_found_title` says the article was not found.

- [ ] **Step 1: Write the failing test**

Set `localStorage` `articles-theme` to `light` and `articles-locale` to `es` before render. Render a probe inside both providers. Expect the probe to show `light` and `es`, and `t("site_name")` to be `Artículos — Tiago Cosmai`. Then call `toggle` and `setLocale("pt")` and expect `articles-theme` `dark` and `articles-locale` `pt`.

Unset keys: theme is `dark`. Locale with `navigator.language` `pt-BR` is `pt`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/context/persistence.test.tsx`

Expected: FAIL with module not found.

- [ ] **Step 3: Write minimal implementation**

Read storage on first render. Ignore storage exceptions. `t` returns the active string, then English, then the key. Setting locale updates `document.documentElement.lang` to `pt-BR`, `en`, or `es`, and `document.title` to `site_name`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/context/persistence.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/i18n/ui.ts src/context/ThemeContext.tsx src/context/LocaleContext.tsx src/context/persistence.test.tsx
git commit -m "Persist theme and locale the way the reader left them."
```

---

### Task 5: First article and loader

**Files:**
- Create: `data/articles.json`, the six content files, `src/content/loadCatalog.ts`, `src/content/loadCatalog.test.ts`
- Modify: `src/types/content.ts` if `LoadedContent` is still missing

**Interfaces:**
- Consumes: `validateCatalog`, `Article`, `Flashcard`, `CatalogError`
- Produces:

```ts
export type LoadedContent = {
  articles: Article[];
  errors: CatalogError[];
  markdown: Record<string, string>;
  flashcards: Record<string, Flashcard[]>;
};

export function loadCatalog(): LoadedContent;
export function reportCatalogErrors(errors: CatalogError[]): void;
```

`loadCatalog` globs `../../data/articles/*.md` with `{ query: "?raw", import: "default", eager: true }` and `../../data/articles/*.json` with `{ import: "default", eager: true }`. Map keys to basenames. Pass them to `validateCatalog`. Returned `markdown` and `flashcards` are basename maps. Only valid flashcard arrays are stored.

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/content/loadCatalog.test.ts`

Expected: FAIL with module not found or missing article.

- [ ] **Step 3: Write the content and loader**

`data/articles.json` slug `o-agente-secreto`, date `2026-09-24`, tags in this order: `InteligenciaArtificial`, `AgentesDeIA`, `Lideranca`, `Tecnologia`, `Governanca`, `DesenvolvimentoDeSoftware`, `TransformacaoDigital`, `AI`, `TechLeadership`.

Titles:

- pt: `O Agente Secreto: quem responde quando a IA começa a agir nas organizações?`
- en: `The Secret Agent: who answers when AI starts acting inside organizations?`
- es: `El agente secreto: ¿quién responde cuando la IA empieza a actuar en las organizaciones?`

Descriptions:

- pt: `Quando a inteligência artificial deixa de responder e passa a agir, a autonomia pode ser delegada, mas a responsabilidade continua humana.`
- en: `When artificial intelligence stops only answering and starts acting, autonomy can be delegated, but accountability stays human.`
- es: `Cuando la inteligencia artificial deja de responder y empieza a actuar, la autonomía puede delegarse, pero la responsabilidad sigue siendo humana.`

Markdown filenames: `o-agente-secreto.pt.md`, `.en.md`, `.es.md`.

Portuguese markdown is the cleaned article below. Do not include the hashtag line. Remove the pasted fragments `ambien` and the duplicated supervision paragraph inside later sections.

```md
# O Agente Secreto: quem responde quando a IA começa a agir nas organizações?

Quando falamos sobre inteligência artificial nas empresas, a conversa normalmente começa pela capacidade da tecnologia.

O que ela consegue escrever? Que tarefas pode automatizar? Quanto tempo pode economizar? Quais decisões consegue apoiar?

Com a evolução dos agentes de IA, porém, precisamos fazer uma pergunta mais importante:

**O que acontece quando a inteligência artificial deixa apenas de responder e começa a agir?**

Um assistente recebe uma solicitação e devolve uma resposta. Um agente pode receber um objetivo, planejar etapas, consultar informações, utilizar ferramentas, tomar decisões intermediárias e executar ações no ambiente.

Essa diferença muda completamente a discussão.

A partir desse momento, não estamos tratando apenas da adoção de uma ferramenta. Estamos falando sobre delegação de autoridade dentro das organizações.

## O agente pode agir, mas não pode assumir a responsabilidade

Podemos delegar a execução de uma tarefa. Também podemos permitir que um agente escolha caminhos dentro de limites previamente definidos.

O que não podemos delegar é a responsabilidade pelo resultado.

Um agente não participa de uma reunião de crise para explicar suas decisões. Não responde a um cliente prejudicado, não assume uma sanção, não repara uma relação de confiança e não pode ser responsabilizado profissionalmente pelas consequências de suas ações.

Por isso, uma ideia precisa permanecer no centro dessa discussão:

**Autonomia pode ser delegada. Accountability não.**

Todo agente utilizado em um contexto organizacional precisa ter, no mínimo, um dono do processo ou do produto, um responsável técnico e regras claras de supervisão e escalonamento.

Quando todos participam, mas ninguém responde, a tecnologia apenas torna mais evidente um problema que já existia no desenho da organização.

## O risco não está apenas no modelo

Muitas empresas ainda avaliam os riscos da IA pensando principalmente na qualidade do modelo utilizado.

Mas, em sistemas agênticos, o risco depende muito mais daquilo que o agente pode fazer.

Ele pode apenas consultar uma informação ou também alterá-la? Pode elaborar uma mensagem ou enviá-la diretamente para milhares de clientes? Pode sugerir uma correção ou publicar uma nova versão em produção? Pode analisar uma transação ou movimentar dinheiro? Pode recomendar a remoção de um acesso ou efetivamente excluir uma conta?

Quanto maior a capacidade de interferir no mundo, maior precisa ser a combinação entre controle, rastreabilidade, supervisão e possibilidade de reversão.

Não devemos classificar o risco apenas pelo modelo. Precisamos considerar tudo o que o agente pode ver, decidir, alterar, comprar, publicar, enviar ou excluir.

## Supervisão humana não pode ser apenas uma formalidade

É comum ouvirmos que determinado processo continua seguro porque existe uma pessoa responsável pela aprovação final.

Mas essa supervisão é realmente efetiva?

Se uma pessoa precisa revisar centenas de decisões por hora, sem contexto suficiente e pressionada pelo tempo, provavelmente não existe supervisão humana. Existe apenas uma confirmação mecânica utilizada para transferir responsabilidade.

Supervisionar exige quatro elementos:

- Tempo para analisar
- Contexto para compreender
- Competência para questionar
- Autoridade para interromper

Sem esses elementos, o ser humano se transforma apenas em uma etapa burocrática dentro de uma decisão essencialmente automatizada.

## Novos atores exigem responsabilidades mais explícitas

A adoção de agentes não significa necessariamente criar um novo cargo para cada responsabilidade. Significa garantir que nenhuma responsabilidade fique órfã.

O patrocinador executivo precisa definir o apetite de risco e explicar por que vale assumir aquele risco.

O dono do produto ou processo deve responder pelo resultado e pelo impacto sobre o usuário.

A liderança técnica precisa garantir arquitetura, integração, observabilidade, qualidade e continuidade.

As áreas de segurança, privacidade, dados e jurídico precisam participar da definição dos limites, e não apenas analisar o problema depois que algo deu errado.

O gestor de pessoas também possui um papel importante. A IA modifica atividades, critérios de avaliação, habilidades e relações de trabalho. A adoção não pode ser tratada exclusivamente como uma iniciativa técnica.

E o profissional responsável pela supervisão precisa ter condições reais de intervir.

A pergunta não deve ser apenas “existe um humano no processo?”, mas:

**Esse humano possui contexto, tempo e autoridade para assumir o controle?**

## O exemplo do desenvolvimento de software

Pensemos em um agente responsável por revisar código.

Ele pode analisar pull requests, identificar vulnerabilidades, sugerir correções e verificar padrões. Isso certamente pode aumentar a capacidade de um time.

Mas o que acontece quando o mesmo agente escreve o código, cria os testes e também realiza a revisão?

Ainda existe uma avaliação independente ou apenas uma validação feita pelo mesmo sistema que produziu a solução?

O mesmo dilema aparece na gestão de incidentes.

Um agente pode correlacionar logs, formular hipóteses, executar diagnósticos e aplicar ações reversíveis previstas em um runbook.

Mas deveria realizar sozinho uma alteração destrutiva ou com grande raio de impacto?

Em que momento a velocidade deixa de ser uma vantagem e começa a amplificar o erro?

Essas perguntas mostram que governança não precisa representar lentidão. Bons controles são justamente aquilo que permite conceder autonomia com segurança.

## Os guardrails que tornam a autonomia possível

Um agente operando em uma organização deveria possuir identidade própria, permissões mínimas e uma trilha clara de auditoria.

Também precisamos definir previamente:

- Quais dados ele pode acessar
- Quais ferramentas pode utilizar
- Quais ações são permitidas
- Quais ações são proibidas
- Quando precisa solicitar aprovação
- Qual é o limite de volume, frequência ou valor
- Como suas decisões serão monitoradas
- Como interromper sua operação
- Como reverter uma ação incorreta
- Quem deve ser acionado em caso de incidente

Esses controles não eliminam completamente os erros. Eles reduzem o raio de impacto, melhoram a capacidade de detecção e permitem uma resposta mais rápida.

A boa organização não é aquela que impede seus agentes de errar, sejam eles humanos ou artificiais. É aquela que limita as consequências, identifica problemas rapidamente, aprende com os incidentes e não esconde a responsabilidade dentro da complexidade técnica.

## O impacto sobre a liderança

A utilização de agentes não diminui a importância da liderança. Ela muda seu foco.

Liderar deixa de significar apenas distribuir tarefas e acompanhar sua execução. Passa a envolver a definição de objetivos, limites, critérios de sucesso e mecanismos de controle.

Em vez de acompanhar somente entregas, precisamos observar decisões e exceções.

Em vez de revisar apenas o resultado final, precisamos avaliar todo o processo construído entre pessoas e inteligência artificial.

Em vez de medir exclusivamente produtividade, precisamos equilibrar velocidade, qualidade, segurança e confiança.

O papel da liderança passa a ser também o de desenhar sistemas de trabalho nos quais pessoas e agentes consigam colaborar sem que a responsabilidade se torne invisível.

## O julgamento humano continua sendo indispensável

A inteligência artificial pode reduzir drasticamente o custo da execução. Mas isso torna o julgamento ainda mais valioso.

O profissional não perde relevância por utilizar IA. Ele perde relevância quando transfere para ela a responsabilidade de pensar, questionar e decidir.

Precisamos evitar tanto a rejeição completa da tecnologia quanto a adoção sem critérios. Organizações maduras criam ambientes seguros para experimentação, aumentam a autonomia conforme surgem evidências e mantêm caminhos claros para interrupção e correção.

Antes de perguntarmos o que um agente consegue fazer, precisamos responder:

**O que ele pode fazer?**

**O que ele não deve fazer?**

**Quem pode interrompê-lo?**

**E quem responde quando essa fronteira for ultrapassada?**

Talvez esse seja o verdadeiro “agente secreto” dentro das organizações: não a inteligência artificial que opera nos bastidores, mas a responsabilidade que desaparece quando ninguém sabe exatamente em nome de quem ela está agindo.
```

English markdown keeps the same sections. The required sentence is `Autonomy can be delegated. Accountability cannot.` Spanish required sentence is `La autonomía se puede delegar. La responsabilidad no.` Translate every section above; do not summarize.

Flashcards use the same ids in every language. Portuguese:

| id | front | back |
| --- | --- | --- |
| `assistant-vs-agent` | Qual é a diferença entre um assistente e um agente? | Um assistente devolve uma resposta a um pedido. Um agente recebe um objetivo, planeja etapas, usa ferramentas e executa ações no ambiente. |
| `autonomy-accountability` | O que pode ser delegado a um agente, e o que não pode? | Autonomia pode ser delegada. Accountability não. O agente não responde por sanção, cliente ou relação de confiança. |
| `owners` | Quem um agente em contexto organizacional precisa ter, no mínimo? | Um dono do processo ou do produto, um responsável técnico e regras claras de supervisão e escalonamento. |
| `risk-surface` | O risco de um agente depende só do modelo? | Não. O risco depende do que ele pode ver, decidir, alterar, comprar, publicar, enviar ou excluir. |
| `supervision` | Quais são os quatro elementos de uma supervisão humana efetiva? | Tempo para analisar, contexto para compreender, competência para questionar e autoridade para interromper. |
| `code-review` | O que falta quando o mesmo agente escreve o código e também o revisa? | Falta avaliação independente. A revisão deixa de ser separada do sistema que produziu a solução. |
| `guardrails` | Quais controles tornam a autonomia possível? | Identidade própria, permissões mínimas, trilha de auditoria, limites, aprovação, monitoramento, parada e reversão. |
| `leadership` | Como muda o foco da liderança com agentes? | Deixa de ser só distribuir tarefas e passa a definir objetivos, limites, critérios de sucesso e mecanismos de controle. |
| `judgment` | Quando o profissional perde relevância ao usar IA? | Quando transfere para a IA a responsabilidade de pensar, questionar e decidir. Usar IA, por si, não reduz relevância. |
| `secret-agent` | Quem é o verdadeiro agente secreto nessa discussão? | A responsabilidade que desaparece quando ninguém sabe em nome de quem a inteligência artificial está agindo. |

Write equivalent full-sentence fronts and backs in `o-agente-secreto.en.json` and `o-agente-secreto.es.json`. JSON shape is `{ "cards": [ { "id", "front", "back" } ] }`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/content/loadCatalog.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add data src/content/loadCatalog.ts src/content/loadCatalog.test.ts src/types/content.ts
git commit -m "Publish the first article and load it from the catalog."
```

---

### Task 6: Home

**Files:**
- Create: `src/components/Flags.tsx`, `src/components/Header.tsx`, `src/components/Footer.tsx`, `src/components/ArticleCard.tsx`, `src/components/ArticleFilters.tsx`, `src/components/ArticleList.tsx`, `src/pages/HomePage.tsx`, `src/pages/HomePage.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `LoadedContent`, `filterArticles`, `formatArticleDate`, `collectTags`, `useLocale`, `useTheme`, `LANGUAGE_OPTIONS`
- Produces: `HomePage({ content })`, header language buttons `lang-pt`, `lang-en`, `lang-es`, theme button `theme-toggle`

- [ ] **Step 1: Write the failing test**

Render `App` inside the test after localStorage locale `pt`. Expect the Portuguese title, the formatted date `24 de setembro de 2026`, the Portuguese description, and a link to `/articles/o-agente-secreto`. Click `lang-en` and expect the English title. Type `zzz` in the search box and expect the empty state. Clear it, set the date input to `2026-09-01`, and expect the empty state again.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/HomePage.test.tsx`

Expected: FAIL because the home is not rendered.

- [ ] **Step 3: Write minimal implementation**

Copy `../portifolio/src/components/Flags.tsx` to `src/components/Flags.tsx` and change the locale import to `../types/content`.

`App` loads the catalog once, calls `reportCatalogErrors` in an effect, and wraps `ThemeProvider` and `LocaleProvider`. The shell `div` has `data-testid="app-shell"`, `data-theme`, and `min-h-screen`. Dark classes: `bg-surface-dark text-white`. Light classes: `bg-surface-light text-ink`. Include `Header`, `main` with `max-w-3xl` and horizontal padding, `HomePage`, and `Footer`. Use `BrowserRouter` only in Task 7; for this task render `HomePage` directly so the test can still wrap with `MemoryRouter` if links need it. The home test should wrap `App` with `MemoryRouter` if `App` does not include a router yet. Prefer putting `MemoryRouter` in the test and `Link` from react-router in the card, with the test rendering:

```tsx
render(
  <MemoryRouter>
    <App />
  </MemoryRouter>,
);
```

So `App` must not include its own router in this task.

`ArticleFilters` is a search input (`label` from `search_label`), a date input (`date_label`), and one button per `collectTags` labeled `#Tag`. Pressed tags use `aria-pressed`. `ArticleList` maps `filterArticles`. Empty list shows `empty_results`. `ArticleCard` is a `Link` with `h2` title, `time` `dateTime={article.date}`, and description. Tag buttons and inputs are controlled by `HomePage` state. Header buttons set locale and toggle theme. Footer is an anchor to `https://tiagocosmai.github.io/` with `footer_portfolio`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/HomePage.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components src/pages/HomePage.tsx src/pages/HomePage.test.tsx src/App.tsx
git commit -m "List articles with search, date, and tag filters."
```

---

### Task 7: Article route and flashcards

**Files:**
- Create: `src/components/MarkdownBody.tsx`, `src/components/Flashcard.tsx`, `src/components/FlashcardDeck.tsx`, `src/pages/ArticlePage.tsx`, `src/pages/ArticlePage.test.tsx`, `src/pages/NotFoundPage.tsx`
- Modify: `src/App.tsx`, `src/pages/HomePage.tsx`

**Interfaces:**
- Consumes: `LoadedContent`, `useLocale`, `react-markdown`, `remark-gfm`
- Produces: routes `/`, `/articles/:slug`, and `*`

- [ ] **Step 1: Write the failing test**

Use `MemoryRouter` only if `App` exports routes through a `Router` prop. Final `App` includes `BrowserRouter`. The test renders with `createMemoryRouter` or passes `initialEntries` by extracting routes. Simplest approach: export `AppRoutes` from `App.tsx` and test it inside `MemoryRouter`.

```tsx
render(
  <MemoryRouter initialEntries={["/articles/o-agente-secreto"]}>
    <LocaleProvider>
      <ThemeProvider>
        <AppRoutes content={loadCatalog()} />
      </ThemeProvider>
    </LocaleProvider>
  </MemoryRouter>,
);
```

Set locale `pt` in localStorage before render. Expect text `Autonomia pode ser delegada. Accountability não.` Click the button whose text is `Qual é a diferença entre um assistente e um agente?` and expect `Um assistente devolve uma resposta a um pedido.` Click a tag link and expect navigation to `/?tag=AI` to show the article still, because the article has that tag.

A second render at `/articles/missing` expects `not_found_title` and a link to `/`.

`HomePage` reads `tag` from `useSearchParams` only on the first render (`useState` initializer). Later filter clicks do not call `setSearchParams`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/ArticlePage.test.tsx`

Expected: FAIL because `AppRoutes` does not exist.

- [ ] **Step 3: Write minimal implementation**

`MarkdownBody` renders `ReactMarkdown` with `remarkGfm` and no `rehype-raw`.

`Flashcard` is a `button` showing `front` or `back`. `aria-pressed` is true when showing the back. `aria-label` is `flip_to_back` or `flip_to_front`. Native button activation covers Enter and Space; do not add a second key handler.

`ArticlePage` finds the slug in `content.articles`. Missing slug renders `NotFoundPage`. Present slug shows the formatted date, tag links to `/?tag=NomeDaTag`, then the markdown. If the markdown string or the flashcard array is missing, show `missing_content` and do not use another language. `FlashcardDeck` has an `h2` from `flashcards_heading`.

`App` uses `BrowserRouter` and `AppRoutes`. Update the Task 1 shell test and the home test so they still find `app-shell` and the home content under `BrowserRouter` (home test can keep `MemoryRouter` around `AppRoutes` instead of `App`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`

Expected: PASS for the whole suite. Then `npm run build`. Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "Open each article with its markdown and flip cards."
```

---

## Self-review

Spec coverage: catalog rules are Task 2; filters, date format, and tag AND are Task 3; theme, locale, and titles are Task 4; first article, three markdowns, and ten flashcards are Task 5; home card and filters are Task 6; article route, tag query, flip card, not-found, and missing-file warning are Task 7. Deploy, quiz, hierarchical tags, and RSS have no tasks.

Placeholder scan: English and Spanish article bodies are specified as full translations of the Portuguese markdown in Task 5, including the two required sentences. English and Spanish flashcards are specified as full-sentence equivalents of the Portuguese table.

Type consistency: `Article`, `LoadedContent`, `filterArticles`, `loadCatalog`, and `AppRoutes` use the same names in later tasks.
