# Admin sitemap refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an administrator refresh a production sitemap and publish it to the Portifolio default branch so GitHub Pages deploys it at the site root.

**Architecture:** Build XML and the generated article metadata from `readPublishedCatalog`. An admin-only endpoint commits the sitemap and metadata together using the GitHub Git Trees API; the existing Pages workflow then deploys them. Portifolio uses that generated public metadata catalog for static blog page generation after the first refresh.

**Tech Stack:** Next.js route handlers, Drizzle catalog, GitHub REST API, Vite build plugin.

**Spec:** `docs/superpowers/specs/2026-11-26-admin-sitemap-design.md`

## Global Constraints

- Canonical origin: `https://tiagocosmai.github.io`.
- Include public articles only, using `readPublishedCatalog` visibility rules.
- Keep `SITEMAP_GITHUB_TOKEN` server-side; limit it to the `tiagocosmai/portifolio` repository.
- A refresh with identical output must not create a commit.
- Do not change the existing admin publishing or LinkedIn sharing behavior.

## Review Focus

- Future, hidden, and incomplete posts must not enter either generated output.
- XML values must be escaped and all sitemap locations absolute.
- Missing or underprivileged GitHub credentials must produce a safe admin error.
- Concurrent branch changes must not be force-pushed over.
- Newly published slugs must receive static HTML metadata pages during the Portifolio build.

---

### Task 1: Build public sitemap and metadata

**Files:**
- Create: `src/sitemap/buildSitemap.ts`

**Interfaces:**
- Consumes `LoadedContent` from `src/types/content.ts`.
- Produces XML plus the generated catalog shape consumed by `readLocalizedBlogArticles`.

- [ ] Implement stable URLs for site roots, locale homes, blog indexes, CV routes, and localized live articles.
- [ ] Escape XML values and serialize the article metadata catalog.

### Task 2: Commit generated files through GitHub

**Files:**
- Create: `src/sitemap/githubPublisher.ts`
- Create: `app/api/admin/sitemap/route.ts`

**Interfaces:**
- Consumes the XML and metadata output from Task 1.
- Produces a result with `updated`, default branch, and URL count.

- [ ] Require an authenticated `admin` session and `SITEMAP_GITHUB_TOKEN`.
- [ ] Read repository default branch and current file versions; avoid a no-op commit.
- [ ] Create one commit containing `public/sitemap.xml` and `src/data/generatedBlogCatalog.json`; reject a non-fast-forward ref update.
- [ ] Re-read the public catalog immediately before moving the branch ref and cancel if it changed during generation.
- [ ] Retry catalog/branch conflicts up to three times with a fresh database snapshot.

### Task 3: Deploy and expose refresh in admin

**Files:**
- Modify: `../portifolio/vite.config.ts`
- Modify: `../portifolio/public/robots.txt`
- Modify: `src/admin/AdminPosts.tsx`
- Create: `docs/SITEMAP.md`

- [ ] Use the generated public catalog as Portifolio's build input, falling back to the checked-in catalog before the first refresh.
- [ ] Add the sitemap URL to `robots.txt`.
- [ ] Add an admin refresh button with pending, success, no-change, and error feedback.
- [ ] Trigger refresh after admin post edits, imports, and visibility changes that affect the public catalog.
- [ ] Add a daily Vercel Cron route, protected by `CRON_SECRET`, so date-scheduled posts enter the sitemap after publication.
- [ ] Document fine-grained token creation and Vercel environment setup.
