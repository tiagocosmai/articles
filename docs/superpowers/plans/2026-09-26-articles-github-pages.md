# Articles GitHub Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the articles site at `https://tiagocosmai.github.io/articles/` without changing the portfolio.

**Architecture:** Production Vite `base` is `/articles/`. Internal article routes become `/:slug` so the public URL is `/articles/:slug`, not `/articles/articles/:slug`. A GitHub Actions workflow tests, builds, copies `index.html` to `404.html`, and deploys with the official Pages actions.

**Tech Stack:** Vite 6, React Router 7, GitHub Actions (`actions/upload-pages-artifact`, `actions/deploy-pages`).

## Global Constraints

- Public home: `https://tiagocosmai.github.io/articles/`.
- Public article: `https://tiagocosmai.github.io/articles/:slug` (example `…/articles/o-agente-secreto`).
- Public tag URL: `https://tiagocosmai.github.io/articles/?tag=AI`.
- Portfolio stays at `https://tiagocosmai.github.io/`. Do not modify `portifolio` or `tiagocosmai.github.io`. Do not use `GH_PAGES_TOKEN`.
- `vite build` and `vite preview` use `base` `/articles/`. `vite` (dev) and Vitest use `base` `/`.
- `BrowserRouter` `basename` comes from `import.meta.env.BASE_URL` after stripping a trailing slash. Empty or `/` means no `basename`.
- Internal routes: `/` home, `/:slug` article, `*` not found.
- `ArticleCard` links to `/${article.slug}`. Tag links stay `/?tag=NomeDaTag`.
- Workflow on push to `master` and `workflow_dispatch`: `npm ci`, `npm test`, `npm run build`, copy `dist/index.html` to `dist/404.html`, then official Pages upload/deploy.
- Deploy job permissions: `contents: read`, `pages: write`, `id-token: write`. No PAT. No `gh-pages` branch. No `deploy` script in `package.json`.
- Enable Pages once with Source **GitHub Actions**.
- Footer remains `https://tiagocosmai.github.io/`.
- If `npm test` hits sandbox `kill EACCES`, use `./node_modules/.bin/vitest run --pool=threads --maxWorkers=1 --no-file-parallelism`.
- Do not run `git config`. Commit with `GIT_AUTHOR_NAME=Tiago Cosmai` `GIT_AUTHOR_EMAIL=tiagocosmai@gmail.com` `GIT_COMMITTER_NAME=Tiago Cosmai` `GIT_COMMITTER_EMAIL=tiagocosmai@gmail.com`.

## File map

- `src/routing/basename.ts` — `routerBasename(baseUrl: string): string | undefined`
- `src/routing/basename.test.ts`
- `src/App.tsx` — `BrowserRouter` + `AppRoutes` paths
- `src/components/ArticleCard.tsx` — card `Link`
- `src/pages/HomePage.test.tsx`, `src/pages/ArticlePage.test.tsx`
- `vite.config.ts` — `base` by command
- `package.json` — `build` copies `404.html`
- `.github/workflows/deploy-pages.yml`

---

### Task 1: Article path is `/:slug`

**Files:**
- Modify: `src/App.tsx`, `src/components/ArticleCard.tsx`, `src/pages/HomePage.test.tsx`, `src/pages/ArticlePage.test.tsx`

**Interfaces:**
- Consumes: `AppRoutes`, `MemoryRouter`, existing home/article tests
- Produces: route `/:slug`; card href `/o-agente-secreto`

- [ ] **Step 1: Write the failing test**

In `src/pages/HomePage.test.tsx` change the card href expectation:

```tsx
).toHaveAttribute("href", "/o-agente-secreto");
```

In `src/pages/ArticlePage.test.tsx` change every `renderAt("/articles/…")` to the slug path:

```tsx
renderAt("/o-agente-secreto");
```

```tsx
renderAt("/missing");
```

Keep `renderAt("/no-such-page")` as it is. `/?tag=AI` and `href` `/` stay the same.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/HomePage.test.tsx src/pages/ArticlePage.test.tsx`

Expected: FAIL because the card still links to `/articles/o-agente-secreto` and `/o-agente-secreto` is not an article route (not-found).

- [ ] **Step 3: Write minimal implementation**

`src/App.tsx` routes:

```tsx
<Routes>
  <Route path="/" element={<HomePage content={content} />} />
  <Route path="/:slug" element={<ArticlePage content={content} />} />
  <Route path="*" element={<NotFoundPage />} />
</Routes>
```

`src/components/ArticleCard.tsx` link:

```tsx
<Link
  to={`/${article.slug}`}
  className={`block rounded-lg border ${border} px-4 py-4`}
>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`

Expected: PASS for the whole suite.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/ArticleCard.tsx src/pages/HomePage.test.tsx src/pages/ArticlePage.test.tsx
GIT_AUTHOR_NAME="Tiago Cosmai" GIT_AUTHOR_EMAIL="tiagocosmai@gmail.com" GIT_COMMITTER_NAME="Tiago Cosmai" GIT_COMMITTER_EMAIL="tiagocosmai@gmail.com" \
  git commit -m "Use a slug path so GitHub Pages does not nest /articles twice."
```

---

### Task 2: Production base `/articles/`

**Files:**
- Create: `src/routing/basename.ts`, `src/routing/basename.test.ts`
- Modify: `src/App.tsx`, `vite.config.ts`

**Interfaces:**
- Consumes: `import.meta.env.BASE_URL`
- Produces:

```ts
export function routerBasename(baseUrl: string): string | undefined;
```

- [ ] **Step 1: Write the failing test**

Create `src/routing/basename.test.ts`:

```ts
import { routerBasename } from "./basename";

describe("routerBasename", () => {
  it("returns undefined for local roots", () => {
    expect(routerBasename("/")).toBeUndefined();
    expect(routerBasename("")).toBeUndefined();
  });

  it("strips a trailing slash from the Pages base", () => {
    expect(routerBasename("/articles/")).toBe("/articles");
    expect(routerBasename("/articles")).toBe("/articles");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/routing/basename.test.ts`

Expected: FAIL because `./basename` does not exist.

- [ ] **Step 3: Write minimal implementation**

`src/routing/basename.ts`:

```ts
export function routerBasename(baseUrl: string): string | undefined {
  const trimmed = baseUrl.replace(/\/$/, "");
  if (trimmed === "" || trimmed === "/") {
    return undefined;
  }
  return trimmed;
}
```

`vite.config.ts`:

```ts
/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig(({ command, isPreview }) => ({
  plugins: [react()],
  base: command === "build" || isPreview ? "/articles/" : "/",
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.ts",
  },
}));
```

In `src/App.tsx` import `routerBasename` and wrap the router:

```tsx
<BrowserRouter basename={routerBasename(import.meta.env.BASE_URL)}>
  <AppRoutes content={content} />
</BrowserRouter>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`

Expected: PASS.

Then: `npm run build`

Expected: exit 0. `dist/index.html` references assets under `/articles/assets/`.

- [ ] **Step 5: Commit**

```bash
git add src/routing/basename.ts src/routing/basename.test.ts src/App.tsx vite.config.ts
GIT_AUTHOR_NAME="Tiago Cosmai" GIT_AUTHOR_EMAIL="tiagocosmai@gmail.com" GIT_COMMITTER_NAME="Tiago Cosmai" GIT_COMMITTER_EMAIL="tiagocosmai@gmail.com" \
  git commit -m "Serve production assets from the /articles/ GitHub Pages path."
```

---

### Task 3: Build 404 fallback and deploy workflow

**Files:**
- Create: `.github/workflows/deploy-pages.yml`
- Modify: `package.json`

**Interfaces:**
- Consumes: `npm test`, `npm run build`
- Produces: `dist/404.html` identical to `dist/index.html`; workflow `Deploy GitHub Pages`

- [ ] **Step 1: Write the failing check**

Do not add a Vitest file for the copy. The failing check is the build output before the script change.

Run: `npm run build && test -f dist/404.html`

Expected: FAIL because `dist/404.html` does not exist.

- [ ] **Step 2: Confirm the failure**

The `test -f` exit code is 1. Do not treat a missing file as success.

- [ ] **Step 3: Write minimal implementation**

`package.json` script:

```json
"build": "tsc --noEmit && vite build && cp dist/index.html dist/404.html"
```

`.github/workflows/deploy-pages.yml`:

```yaml
name: Deploy GitHub Pages

on:
  push:
    branches: [master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: npm

      - name: Install
        run: npm ci

      - name: Test
        run: npm test

      - name: Build
        run: npm run build

      - name: Verify Pages fallback
        run: |
          test -f dist/index.html
          test -f dist/404.html
          cmp -s dist/index.html dist/404.html
          grep -q '/articles/assets/' dist/index.html

      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Enable Pages with GitHub Actions as the source (once):

```bash
gh api -X POST repos/tiagocosmai/articles/pages -f build_type=workflow
```

If the API says Pages already exists, PATCH instead:

```bash
gh api -X PUT repos/tiagocosmai/articles/pages -f build_type=workflow
```

Do not create a `deploy` script. Do not push to `gh-pages`. Do not touch the portfolio.

- [ ] **Step 4: Run the local checks**

Run: `npm test && npm run build && test -f dist/404.html && cmp -s dist/index.html dist/404.html && grep -q '/articles/assets/' dist/index.html`

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add package.json .github/workflows/deploy-pages.yml
GIT_AUTHOR_NAME="Tiago Cosmai" GIT_AUTHOR_EMAIL="tiagocosmai@gmail.com" GIT_COMMITTER_NAME="Tiago Cosmai" GIT_COMMITTER_EMAIL="tiagocosmai@gmail.com" \
  git commit -m "Deploy the articles build to GitHub Pages on every master push."
```

After this commit is on `master` (push or PR merge), the workflow publishes the site. Confirm `https://tiagocosmai.github.io/articles/` and `https://tiagocosmai.github.io/articles/o-agente-secreto` (including a refresh on the article URL). Confirm `https://tiagocosmai.github.io/` is still the portfolio.

---

## Self-review

Spec coverage: public URLs and untouched portfolio are Task 3 plus Task 2 base; `/:slug` and card href are Task 1; `routerBasename` and Vite `base` split are Task 2; `404.html`, workflow, permissions, no PAT / no `gh-pages` / no `deploy` script, and enabling Actions Pages are Task 3. Tag query form and footer URL are unchanged. Portfolio link from the portfolio site stays out of scope.

Placeholder scan: no TBD, no “add tests later”, no “similar to Task N”.

Type consistency: `routerBasename(baseUrl: string): string | undefined` is the only new API; Task 2 consumes it in `App`.
