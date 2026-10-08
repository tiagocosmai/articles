# Admin Posts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the admin create, edit, and deactivate a post in the database, keep file seeding from wiping those edits, and redirect every former slug to the current one while the post is live.

**Architecture:** `article_slug_redirects` stores each former slug. `readPublishedCatalog` omits a post with an empty body and emits redirects only for live posts. `seedCatalog` copies bodies onto an existing row matched by the current or a former slug, and inserts a file the database has never seen. `src/api/adminPosts.ts` validates and writes slug, date, titles, and descriptions. `/admin/posts` uses the existing admin gate.

**Tech Stack:** Next.js 15 route handlers, Drizzle ORM, PGlite in Vitest, Auth.js session, existing `AdminGate` and `AdminFrame`.

## Global Constraints

- The form stores slug, date, and Portuguese, English, and Spanish title and description. The body is not in the form.
- A new post is stored with three empty bodies and stays off the public blog until all three bodies have text.
- Editing a post that already has a body changes the public site immediately and does not change the body.
- Deactivate sets `deleted_at`. Activate clears `deleted_at`. Activate does not publish a post that still lacks a body.
- A future `publishedOn` does not hide a post.
- Changing the slug redirects each previous URL to the current slug.
- Seeding from `data/articles` copies only the body of posts already in the database. Admin-edited date, titles, descriptions, slug, and `deleted_at` survive.
- Scheduling by date, per-article comment or reaction switches, markdown upload, LinkedIn copy, tag and flashcard editing, and restoring a deleted comment are out of scope.
- `/admin/posts` uses the same gate as `/admin` and `/admin/comentarios`. Logged out shows the login modal and no list. Closing it stays on the gate. Another account shows `Esta conta não administra o blog.` and navigates to `https://tiagocosmai.github.io/pt/blog`. An admin sees the list.
- The nav link is `Posts`, href `/admin/posts`, with `aria-current="page"` on the current route.
- API without a session returns 401 `{ message: "unauthorized" }`. API with another role returns 403 `{ message: "forbidden" }`. Those responses do not use the page sentence.
- Admin state is `empty` / `Sem corpo` when any language body is empty after trim, including when `deleted_at` is set. `hidden` / `Oculto` when all three bodies have text and `deleted_at` is set. `live` / `No ar` when all three bodies have text and `deleted_at` is null.
- The row button follows `deleted_at`: `Desativar` when it is null, `Ativar` when it is set. Neither asks for confirmation.
- Activate and deactivate set `updated_at` only when they change `deleted_at`. Repeating the current visibility returns 200 and does not write.
- The admin list order is `publishedOn` descending, then slug ascending.
- The title shown is Portuguese, then English, then Spanish, then the slug.
- Empty admin list says `Não há posts.` Load failure says `Não foi possível carregar.` Save failure says `Não foi possível salvar.` The form and the row stay as they were.
- `Novo post` and `Editar` replace the list with the form on the same route. `Voltar` returns to the list without calling the API. Submit is `Salvar`.
- Field labels are `Slug`, `Data`, `Título em português`, `Título em inglês`, `Título em espanhol`, `Descrição em português`, `Descrição em inglês`, `Descrição em espanhol`.
- The stored slug is trimmed and lowercased and must match `^[a-z0-9]+(?:-[a-z0-9]+)*$`. The date is a real `AAAA-MM-DD`. Titles and descriptions are stored trimmed and must be non-empty in all three languages.
- Create and edit validation order is slug, date, Portuguese title, English title, Spanish title, Portuguese description, English description, Spanish description. The first missing or invalid field returns 400. Messages are `invalid slug`, `invalid date`, `invalid title`, and `invalid description`. After the fields are valid, an occupied slug returns 400 `slug taken`.
- `active` missing or not a boolean returns 400 `{ message: "invalid visibility" }`. A missing post returns 404 `{ message: "not found" }`.
- Successful create, edit, list, and visibility return 200.
- `article_slug_redirects` stores `slug` and `article_id`. The old slug is unique and does not equal any current article slug after the transaction commits.
- Slug replacement runs in one transaction: same slug updates only date, titles, and descriptions; another post's slug or redirect returns `slug taken`; this post's own redirect row for the new slug is deleted; the current slug is inserted as a redirect; then the article slug becomes the new one.
- `getArticleBySlug` returns 301 `{ slug }` with the current slug when the requested slug is a redirect and the post is `live`. It returns 404 `{ message: "not found" }` when the post is hidden, has an empty body, or the slug does not exist.
- `app/[[...path]]/page.tsx` permanently redirects to `/{slug}` before rendering the shell when the path has one segment and `getArticleBySlug` returns 301.
- The public list includes `redirects: { from, to }[]` only for `live` posts. `to` is the current slug. `ArticlePage` replaces the URL with `/{to}` without stacking the old one.
- Seed looks up a file by the current slug or a redirect slug. When it finds the post, it copies the body of each existing language the file actually contains. A language with no markdown in the file keeps its database body. Seed does not change title, description, date, slug, `deleted_at`, tags, or flashcards on that path. An unknown file slug inserts the whole post as today. Seed does not delete a database-only post.
- Tests run with `npx vitest run --exclude '.worktrees/**'`.

---

### Task 1: Store former slugs

**Files:**
- Modify: `src/db/schema.ts`
- Modify: `drizzle/meta/_journal.json`
- Create: `drizzle/0003_article_slug_redirects.sql`
- Test: `src/db/schema.test.ts`

**Interfaces:**
- Consumes: `articles`, `createTestDb()`
- Produces: `articleSlugRedirects` table with primary key `slug` and `articleId` referencing `articles.id`. Later tasks import `articleSlugRedirects` from `src/db/schema.ts`.

- [ ] **Step 1: Branch from master**

```bash
git fetch origin
git switch -c cursor/admin-posts origin/master
```

Expected: the branch contains `src/db/schema.ts` and `drizzle/0002_auth_methods.sql`. Untracked spec and plan files stay in the working tree.

- [ ] **Step 2: Write the failing redirect-table test**

Add this test to `src/db/schema.test.ts`. Import `articleSlugRedirects` from `./schema`.

```ts
it("rejects two redirects with the same former slug", async () => {
  const db = await createTestDb();
  const [first] = await db.insert(articles).values({ slug: "nota", publishedOn: "2026-10-01" }).returning();
  const [second] = await db.insert(articles).values({ slug: "outra", publishedOn: "2026-10-02" }).returning();
  await db.insert(articleSlugRedirects).values({ slug: "antiga", articleId: first.id });
  await expect(
    db.insert(articleSlugRedirects).values({ slug: "antiga", articleId: second.id }),
  ).rejects.toThrow();
});
```

- [ ] **Step 3: Run the schema test and confirm it fails**

Run: `npx vitest run src/db/schema.test.ts --exclude '.worktrees/**'`

Expected: FAIL because `articleSlugRedirects` is not exported.

- [ ] **Step 4: Add the table and migration**

In `src/db/schema.ts`, after `articles`, add:

```ts
export const articleSlugRedirects = pgTable("article_slug_redirects", {
  slug: text("slug").primaryKey(),
  articleId: uuid("article_id")
    .notNull()
    .references(() => articles.id),
});
```

Create `drizzle/0003_article_slug_redirects.sql`:

```sql
CREATE TABLE "article_slug_redirects" (
	"slug" text PRIMARY KEY NOT NULL,
	"article_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "article_slug_redirects" ADD CONSTRAINT "article_slug_redirects_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE no action ON UPDATE no action;
```

Append this entry to `drizzle/meta/_journal.json` after `0002_auth_methods`:

```json
{
  "idx": 3,
  "version": "7",
  "when": 1791070000000,
  "tag": "0003_article_slug_redirects",
  "breakpoints": true
}
```

- [ ] **Step 5: Run the schema test and confirm it passes**

Run: `npx vitest run src/db/schema.test.ts --exclude '.worktrees/**'`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/db/schema.ts src/db/schema.test.ts drizzle/0003_article_slug_redirects.sql drizzle/meta/_journal.json
git commit -m "$(cat <<'EOF'
Record each former article slug so a rename can redirect.

EOF
)"
```

---

### Task 2: Hide empty posts and publish live redirects

**Files:**
- Modify: `src/types/content.ts`
- Modify: `src/content/loadCatalog.ts`
- Modify: `src/db/catalog.ts`
- Modify: `src/db/catalog.test.ts`
- Modify: `src/api/articles.test.ts`
- Modify: `src/api/adminComments.test.ts`
- Modify: `src/api/adminReport.test.ts`
- Modify: `src/api/comments.test.ts`
- Modify: `src/api/reactions.test.ts`
- Modify: `src/db/seedCatalog.test.ts`
- Test: `src/db/catalog.test.ts`

**Interfaces:**
- Consumes: `articleSlugRedirects`, `readPublishedCatalog(db)`
- Produces: `LoadedContent.redirects` as `{ from: string; to: string }[]`. `readPublishedCatalog` returns that field. A post is absent from `articles` and from `redirects` when `deleted_at` is set or any body trims to empty. Redirect `to` is the current slug of a live post.

- [ ] **Step 1: Write the failing catalog test**

Add this test to `src/db/catalog.test.ts`. Import `articleSlugRedirects` from `./schema`.

```ts
it("hides an empty body and lists redirects only for a live post", async () => {
  const db = await createTestDb();
  const [live] = await db.insert(articles).values({ slug: "nota-nova", publishedOn: "2026-10-07" }).returning();
  const [future] = await db.insert(articles).values({ slug: "futuro", publishedOn: "2026-12-01" }).returning();
  const [blank] = await db.insert(articles).values({ slug: "vazio", publishedOn: "2026-11-01" }).returning();
  await db.insert(articleLocales).values([
    { articleId: live.id, locale: "pt", title: "PT", description: "d", body: "corpo" },
    { articleId: live.id, locale: "en", title: "EN", description: "d", body: "body" },
    { articleId: live.id, locale: "es", title: "ES", description: "d", body: "cuerpo" },
    { articleId: future.id, locale: "pt", title: "PT", description: "d", body: "corpo" },
    { articleId: future.id, locale: "en", title: "EN", description: "d", body: "body" },
    { articleId: future.id, locale: "es", title: "ES", description: "d", body: "cuerpo" },
    { articleId: blank.id, locale: "pt", title: "PT", description: "d", body: "   " },
    { articleId: blank.id, locale: "en", title: "EN", description: "d", body: "body" },
    { articleId: blank.id, locale: "es", title: "ES", description: "d", body: "cuerpo" },
  ]);
  await db.insert(articleSlugRedirects).values([
    { slug: "nota", articleId: live.id },
    { slug: "antes", articleId: blank.id },
  ]);

  const content = await readPublishedCatalog(db);
  expect(content.articles.map((article) => article.slug)).toEqual(["futuro", "nota-nova"]);
  expect(content.redirects).toEqual([{ from: "nota", to: "nota-nova" }]);
});
```

- [ ] **Step 2: Run the catalog test and confirm it fails**

Run: `npx vitest run src/db/catalog.test.ts --exclude '.worktrees/**'`

Expected: FAIL because `redirects` is missing and `vazio` is still public.

- [ ] **Step 3: Add redirects to the catalog type and skip empty bodies**

In `src/types/content.ts`, add:

```ts
export type ArticleRedirect = { from: string; to: string };
```

Add `redirects: ArticleRedirect[]` to `LoadedContent`.

In `src/content/loadCatalog.ts`, return `redirects: []` beside `flashcards`.

Add `redirects: []` to every `LoadedContent` object literal in:

- `src/api/articles.test.ts`
- `src/api/adminComments.test.ts`
- `src/api/adminReport.test.ts`
- `src/api/comments.test.ts`
- `src/api/reactions.test.ts`
- `src/db/seedCatalog.test.ts`

In `src/api/articles.test.ts`, the empty-list expectation becomes:

```ts
body: { articles: [], errors: [], markdown: {}, flashcards: {}, redirects: [] },
```

In `src/db/catalog.ts`, import `articleSlugRedirects`. Change the empty catalog to include `redirects: []`. Inside the article loop, after the three-locale check, skip a post when any translation body trims to empty:

```ts
if (translations.some((row) => row.body.trim() === "")) continue;
```

Record each kept article id. After the loop, when that id list is non-empty, select `articleSlugRedirects` with `inArray(articleSlugRedirects.articleId, liveIds)` and map `{ from: row.slug, to: slugById.get(row.articleId) }`. Return those redirects. When `published.length === 0`, return `redirects: []`.

- [ ] **Step 4: Run the catalog and article tests and confirm they pass**

Run: `npx vitest run src/db/catalog.test.ts src/api/articles.test.ts --exclude '.worktrees/**'`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types/content.ts src/content/loadCatalog.ts src/db/catalog.ts src/db/catalog.test.ts src/api/articles.test.ts src/api/adminComments.test.ts src/api/adminReport.test.ts src/api/comments.test.ts src/api/reactions.test.ts src/db/seedCatalog.test.ts
git commit -m "$(cat <<'EOF'
Hide posts with an empty body and publish redirects for live posts.

EOF
)"
```

---

### Task 3: Resolve a former slug

**Files:**
- Modify: `src/api/articles.ts`
- Modify: `src/api/articles.test.ts`
- Test: `src/api/articles.test.ts`

**Interfaces:**
- Consumes: `readPublishedCatalog`, `LoadedContent.redirects`
- Produces: `getArticleBySlug(db, slug)` returning `{ status: 200, body: { article, markdown, flashcards } }`, `{ status: 301, body: { slug: string } }`, or `{ status: 404, body: { message: "not found" } }`.

- [ ] **Step 1: Write the failing slug test**

Add this test to `src/api/articles.test.ts`. Import `articleLocales` and `articleSlugRedirects` from `../db/schema`.

```ts
it("redirects a former slug only while the post is live", async () => {
  const db = await createTestDb();
  const [article] = await db.insert(articles).values({ slug: "nota-nova", publishedOn: "2026-10-07" }).returning();
  await db.insert(articleLocales).values([
    { articleId: article.id, locale: "pt", title: "PT", description: "d", body: "corpo" },
    { articleId: article.id, locale: "en", title: "EN", description: "d", body: "body" },
    { articleId: article.id, locale: "es", title: "ES", description: "d", body: "cuerpo" },
  ]);
  await db.insert(articleSlugRedirects).values({ slug: "nota", articleId: article.id });

  expect(await getArticleBySlug(db, "nota")).toEqual({ status: 301, body: { slug: "nota-nova" } });
  expect((await getArticleBySlug(db, "nota-nova")).status).toBe(200);

  await db.update(articleLocales).set({ body: "   " }).where(eq(articleLocales.articleId, article.id));
  expect(await getArticleBySlug(db, "nota")).toEqual({ status: 404, body: { message: "not found" } });

  await db.update(articleLocales).set({ body: "corpo" }).where(eq(articleLocales.articleId, article.id));
  await db.update(articles).set({ deletedAt: new Date() }).where(eq(articles.id, article.id));
  expect(await getArticleBySlug(db, "nota")).toEqual({ status: 404, body: { message: "not found" } });
  expect(await getArticleBySlug(db, "ausente")).toEqual({ status: 404, body: { message: "not found" } });
});
```

- [ ] **Step 2: Run the article test and confirm it fails**

Run: `npx vitest run src/api/articles.test.ts --exclude '.worktrees/**'`

Expected: FAIL because `nota` returns 404 instead of 301.

- [ ] **Step 3: Return 301 from the catalog redirects**

In `getArticleBySlug`, after the catalog is loaded, keep the current 200 path when `catalog.articles` contains the slug. When it does not, find `catalog.redirects` where `from === slug`. If found, return `{ status: 301, body: { slug: redirect.to } }`. Otherwise return the existing 404.

- [ ] **Step 4: Run the article test and confirm it passes**

Run: `npx vitest run src/api/articles.test.ts --exclude '.worktrees/**'`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/api/articles.ts src/api/articles.test.ts
git commit -m "$(cat <<'EOF'
Send an old slug to the current one when the post is live.

EOF
)"
```

---

### Task 4: Seed bodies without wiping admin edits

**Files:**
- Modify: `src/db/seedCatalog.ts`
- Modify: `src/db/seedCatalog.test.ts`
- Test: `src/db/seedCatalog.test.ts`

**Interfaces:**
- Consumes: `articleSlugRedirects`, `articleLocales`, `LoadedContent`
- Produces: `seedCatalog(db, content)` unchanged in signature. An existing row matched by current slug or former slug gets body updates only. A new file slug is inserted with titles, descriptions, body, date, tags, and flashcards.

- [ ] **Step 1: Write the failing seed tests**

Add these tests to `src/db/seedCatalog.test.ts`. Import `articleLocales` and `articleSlugRedirects` from `../db/schema`.

```ts
it("copies a new body and keeps the admin title, date, and slug", async () => {
  const db = await createTestDb();
  await seedCatalog(db, content);
  const [article] = await db.select().from(articles).where(eq(articles.slug, "o-agente-secreto"));
  await db.update(articles).set({ publishedOn: "2026-01-02" }).where(eq(articles.id, article.id));
  await db.update(articleLocales).set({ title: "Editado" }).where(eq(articleLocales.articleId, article.id));
  await seedCatalog(db, {
    ...content,
    markdown: { ...content.markdown, "o-agente-secreto.pt.md": "corpo novo" },
  });
  const [kept] = await db.select().from(articles).where(eq(articles.id, article.id));
  const locales = await db.select().from(articleLocales).where(eq(articleLocales.articleId, article.id));
  expect(kept.publishedOn).toBe("2026-01-02");
  expect(kept.slug).toBe("o-agente-secreto");
  expect(locales.find((row) => row.locale === "pt")).toMatchObject({ title: "Editado", body: "corpo novo" });
});

it("updates the body through a former slug and leaves a database-only post", async () => {
  const db = await createTestDb();
  await seedCatalog(db, content);
  const [article] = await db.select().from(articles).where(eq(articles.slug, "o-agente-secreto"));
  await db.update(articles).set({ slug: "agente" }).where(eq(articles.id, article.id));
  await db.insert(articleSlugRedirects).values({ slug: "o-agente-secreto", articleId: article.id });
  const [onlyDb] = await db.insert(articles).values({ slug: "so-banco", publishedOn: "2026-10-03" }).returning();
  await seedCatalog(db, {
    ...content,
    markdown: { ...content.markdown, "o-agente-secreto.en.md": "body novo" },
  });
  const rows = await db.select().from(articles);
  expect(rows.map((row) => row.slug).sort()).toEqual(["agente", "so-banco"]);
  const locales = await db.select().from(articleLocales).where(eq(articleLocales.articleId, article.id));
  expect(locales.find((row) => row.locale === "en")?.body).toBe("body novo");
  expect(onlyDb.slug).toBe("so-banco");
});

it("keeps a body when the file has no markdown for that language", async () => {
  const db = await createTestDb();
  await seedCatalog(db, content);
  const { "o-agente-secreto.en.md": _english, ...markdown } = content.markdown;
  await seedCatalog(db, { ...content, markdown });
  const [article] = await db.select().from(articles).where(eq(articles.slug, "o-agente-secreto"));
  const locales = await db.select().from(articleLocales).where(eq(articleLocales.articleId, article.id));
  expect(locales.find((row) => row.locale === "en")?.body).toBe("body");
});
```

- [ ] **Step 2: Run the seed test and confirm it fails**

Run: `npx vitest run src/db/seedCatalog.test.ts --exclude '.worktrees/**'`

Expected: FAIL because the second seed restores `publishedOn` to `2026-09-24` and the title to `PT`, or inserts a second row for the old slug.

- [ ] **Step 3: Split seed into body update and full insert**

Replace `src/db/seedCatalog.ts` with:

```ts
import { and, eq } from "drizzle-orm";
import type { LoadedContent, Locale } from "../types/content";
import { articleLocales, articleSlugRedirects, articleTags, articles, flashcards, tagLocales, tags } from "./schema";
import type { TestDatabase } from "./testDb";

const locales: Locale[] = ["pt", "en", "es"];

export async function seedCatalog(db: TestDatabase, content: LoadedContent): Promise<void> {
  await db.transaction(async (tx) => {
    const tagIdByCode = new Map<string, string>();
    async function ensureTag(tag: LoadedContent["articles"][number]["tags"][number]) {
      const known = tagIdByCode.get(tag.id);
      if (known) return known;
      const [row] = await tx
        .insert(tags)
        .values({ code: tag.id })
        .onConflictDoUpdate({ target: tags.code, set: { code: tag.id } })
        .returning();
      tagIdByCode.set(tag.id, row.id);
      for (const locale of locales) {
        await tx
          .insert(tagLocales)
          .values({ tagId: row.id, locale, label: tag[locale] })
          .onConflictDoUpdate({
            target: [tagLocales.tagId, tagLocales.locale],
            set: { label: tag[locale] },
          });
      }
      return row.id;
    }

    const existing = await tx.select().from(articles);
    const redirects = await tx.select().from(articleSlugRedirects);
    const idByOldSlug = new Map(redirects.map((row) => [row.slug, row.articleId]));

    for (const article of content.articles) {
      const current =
        existing.find((row) => row.slug === article.slug) ??
        existing.find((row) => row.id === idByOldSlug.get(article.slug));
      if (current) {
        const localeRows = await tx.select().from(articleLocales).where(eq(articleLocales.articleId, current.id));
        for (const locale of locales) {
          const filename = article.locales[locale].markdown;
          if (!(filename in content.markdown)) continue;
          if (!localeRows.some((row) => row.locale === locale)) continue;
          await tx
            .update(articleLocales)
            .set({ body: content.markdown[filename] })
            .where(and(eq(articleLocales.articleId, current.id), eq(articleLocales.locale, locale)));
        }
        continue;
      }

      for (const tag of article.tags) await ensureTag(tag);
      const [row] = await tx.insert(articles).values({ slug: article.slug, publishedOn: article.date }).returning();
      await tx.insert(articleLocales).values(
        locales.map((locale) => ({
          articleId: row.id,
          locale,
          title: article.locales[locale].title,
          description: article.locales[locale].description,
          body: content.markdown[article.locales[locale].markdown] ?? "",
        })),
      );
      if (article.tags.length > 0) {
        await tx.insert(articleTags).values(
          article.tags.map((tag, position) => ({
            articleId: row.id,
            tagId: tagIdByCode.get(tag.id) ?? "",
            position,
          })),
        );
      }
      const cards = locales.flatMap((locale) =>
        (content.flashcards[`${article.slug}.${locale}.json`] ?? []).map((card, position) => ({
          articleId: row.id,
          locale,
          code: card.id,
          front: card.front,
          back: card.back,
          position,
        })),
      );
      if (cards.length > 0) await tx.insert(flashcards).values(cards);
    }
  });
}
```

- [ ] **Step 4: Run the seed test and confirm it passes**

Run: `npx vitest run src/db/seedCatalog.test.ts --exclude '.worktrees/**'`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/db/seedCatalog.ts src/db/seedCatalog.test.ts
git commit -m "$(cat <<'EOF'
Keep admin edits when the file catalog is seeded again.

EOF
)"
```

---

### Task 5: Create, edit, and deactivate through the admin API

**Files:**
- Create: `src/api/adminPosts.ts`
- Create: `src/api/adminPosts.test.ts`
- Create: `app/api/admin/posts/route.ts`
- Create: `app/api/admin/posts/[id]/route.ts`
- Create: `app/api/admin/posts/[id]/visibility/route.ts`
- Test: `src/api/adminPosts.test.ts`

**Interfaces:**
- Consumes: `ReaderSession` from `src/api/reactions.ts`, `articleSlugRedirects`, `getArticleBySlug`
- Produces:

```ts
export type AdminPost = {
  id: string;
  slug: string;
  publishedOn: string;
  title: { pt: string; en: string; es: string };
  description: { pt: string; en: string; es: string };
  state: "live" | "hidden" | "empty";
};

export function listAdminPosts(db, session): Promise<
  { status: 401 | 403; body: { message: "unauthorized" | "forbidden" } } | { status: 200; body: { posts: AdminPost[] } }
>;
export function createAdminPost(db, session, input: unknown): Promise<
  | { status: 401 | 403; body: { message: "unauthorized" | "forbidden" } }
  | { status: 400; body: { message: "invalid slug" | "invalid date" | "invalid title" | "invalid description" | "slug taken" } }
  | { status: 200; body: { post: AdminPost } }
>;
export function updateAdminPost(db, session, id: string, input: unknown): Promise<
  | { status: 401 | 403; body: { message: "unauthorized" | "forbidden" } }
  | { status: 400; body: { message: "invalid slug" | "invalid date" | "invalid title" | "invalid description" | "slug taken" } }
  | { status: 404; body: { message: "not found" } }
  | { status: 200; body: { post: AdminPost } }
>;
export function setAdminPostVisibility(db, session, id: string, active: unknown): Promise<
  | { status: 401 | 403; body: { message: "unauthorized" | "forbidden" } }
  | { status: 400; body: { message: "invalid visibility" } }
  | { status: 404; body: { message: "not found" } }
  | { status: 200; body: { post: AdminPost } }
>;
```

- [ ] **Step 1: Write the failing admin post test**

Create `src/api/adminPosts.test.ts`:

```ts
// @vitest-environment node
import { eq } from "drizzle-orm";
import { articleLocales, articleSlugRedirects, articles } from "../db/schema";
import { createTestDb } from "../db/testDb";
import { getArticleBySlug } from "./articles";
import { createAdminPost, listAdminPosts, setAdminPostVisibility, updateAdminPost } from "./adminPosts";

const admin = { id: "00000000-0000-4000-8000-000000000001", role: "admin" as const, name: "Tiago" };
const member = { id: "00000000-0000-4000-8000-000000000002", role: "member" as const, name: "Ada" };
const input = {
  slug: " Nota-Nova ",
  publishedOn: "2026-10-07",
  title: { pt: " PT ", en: "EN", es: "ES" },
  description: { pt: "d", en: "d", es: "d" },
};

it("creates an empty post, edits it, and redirects both former slugs", async () => {
  const db = await createTestDb();
  expect((await listAdminPosts(db, null)).status).toBe(401);
  expect((await createAdminPost(db, null, input)).status).toBe(401);
  expect((await listAdminPosts(db, member)).status).toBe(403);
  expect((await createAdminPost(db, admin, { ...input, slug: "Nota Nova" })).body).toEqual({ message: "invalid slug" });
  expect((await createAdminPost(db, admin, { ...input, slug: "ok", publishedOn: "2026-02-31" })).body).toEqual({
    message: "invalid date",
  });
  expect((await createAdminPost(db, admin, { ...input, title: { pt: " ", en: "EN", es: "ES" } })).body).toEqual({
    message: "invalid title",
  });
  expect((await createAdminPost(db, admin, { ...input, description: { pt: "d", en: " ", es: "d" } })).body).toEqual({
    message: "invalid description",
  });

  const created = await createAdminPost(db, admin, input);
  expect(created.status).toBe(200);
  if (created.status !== 200) throw new Error("expected create");
  expect(created.body.post).toMatchObject({
    slug: "nota-nova",
    publishedOn: "2026-10-07",
    title: { pt: "PT", en: "EN", es: "ES" },
    state: "empty",
  });
  const locales = await db.select().from(articleLocales).where(eq(articleLocales.articleId, created.body.post.id));
  expect(locales.map((row) => row.body)).toEqual(["", "", ""]);

  await db.update(articleLocales).set({ body: "corpo" }).where(eq(articleLocales.articleId, created.body.post.id));
  const renamed = await updateAdminPost(db, admin, created.body.post.id, {
    ...input,
    slug: "nota-final",
    title: { pt: "Final", en: "EN", es: "ES" },
  });
  expect(renamed.status).toBe(200);
  if (renamed.status !== 200) throw new Error("expected rename");
  expect(renamed.body.post.slug).toBe("nota-final");
  expect(renamed.body.post.state).toBe("live");
  const afterRename = await db.select().from(articleLocales).where(eq(articleLocales.articleId, created.body.post.id));
  expect(afterRename.every((row) => row.body === "corpo")).toBe(true);

  const again = await updateAdminPost(db, admin, created.body.post.id, { ...input, slug: "nota-ultima" });
  expect(again.status).toBe(200);
  expect(await getArticleBySlug(db, "nota-nova")).toEqual({ status: 301, body: { slug: "nota-ultima" } });
  expect(await getArticleBySlug(db, "nota-final")).toEqual({ status: 301, body: { slug: "nota-ultima" } });

  const reclaimed = await updateAdminPost(db, admin, created.body.post.id, { ...input, slug: "nota-nova" });
  expect(reclaimed.status).toBe(200);
  if (reclaimed.status !== 200) throw new Error("expected reclaim");
  const redirects = await db.select().from(articleSlugRedirects);
  expect(redirects.map((row) => row.slug).sort()).toEqual(["nota-final", "nota-ultima"]);
  expect(await getArticleBySlug(db, "nota-nova")).toMatchObject({ status: 200 });

  const [other] = await db.insert(articles).values({ slug: "ocupado", publishedOn: "2026-10-01" }).returning();
  await db.insert(articleSlugRedirects).values({ slug: "alheio", articleId: other.id });
  expect((await updateAdminPost(db, admin, created.body.post.id, { ...input, slug: "ocupado" })).body).toEqual({
    message: "slug taken",
  });
  expect((await updateAdminPost(db, admin, created.body.post.id, { ...input, slug: "alheio" })).body).toEqual({
    message: "slug taken",
  });
  expect((await updateAdminPost(db, admin, "00000000-0000-4000-8000-000000000099", input)).status).toBe(404);

  const hidden = await setAdminPostVisibility(db, admin, created.body.post.id, false);
  expect(hidden.status).toBe(200);
  if (hidden.status !== 200) throw new Error("expected hide");
  expect(hidden.body.post.state).toBe("hidden");
  const [row] = await db.select().from(articles).where(eq(articles.id, created.body.post.id));
  const repeated = await setAdminPostVisibility(db, admin, created.body.post.id, false);
  expect(repeated.status).toBe(200);
  const [still] = await db.select().from(articles).where(eq(articles.id, created.body.post.id));
  expect(still.updatedAt).toEqual(row.updatedAt);

  const shown = await setAdminPostVisibility(db, admin, created.body.post.id, true);
  expect(shown.status).toBe(200);
  if (shown.status !== 200) throw new Error("expected show");
  expect(shown.body.post.state).toBe("live");
  expect((await setAdminPostVisibility(db, admin, created.body.post.id, "yes")).body).toEqual({
    message: "invalid visibility",
  });

  const listed = await listAdminPosts(db, admin);
  expect(listed.status).toBe(200);
  if (listed.status !== 200) throw new Error("expected list");
  expect(listed.body.posts.map((post) => post.slug)).toEqual(["nota-nova", "ocupado"]);
});
```

`ocupado` has no locales, so its state is `empty`. It sorts after `nota-nova` because `2026-10-01` is older than `2026-10-07`.

- [ ] **Step 2: Run the admin post test and confirm it fails**

Run: `npx vitest run src/api/adminPosts.test.ts --exclude '.worktrees/**'`

Expected: FAIL because `./adminPosts` does not exist.

- [ ] **Step 3: Implement the post functions and routes**

Create `src/api/adminPosts.ts`:

```ts
import { and, asc, desc, eq } from "drizzle-orm";
import { articleLocales, articleSlugRedirects, articles } from "../db/schema";
import type { TestDatabase } from "../db/testDb";
import type { ReaderSession } from "./reactions";

const locales = ["pt", "en", "es"] as const;
type Locale = (typeof locales)[number];
type Copy = Record<Locale, string>;

export type AdminPost = {
  id: string;
  slug: string;
  publishedOn: string;
  title: Copy;
  description: Copy;
  state: "live" | "hidden" | "empty";
};

function denied(session: ReaderSession) {
  if (!session) return { status: 401 as const, body: { message: "unauthorized" as const } };
  if (session.role !== "admin") return { status: 403 as const, body: { message: "forbidden" as const } };
  return null;
}

function text(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function slugOf(value: unknown) {
  if (typeof value !== "string") return null;
  const slug = value.trim().toLowerCase();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : null;
}

function dateOf(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return value;
}

function fields(input: unknown) {
  if (typeof input !== "object" || input === null) return { error: "invalid slug" as const };
  const record = input as Record<string, unknown>;
  const slug = slugOf(record.slug);
  if (!slug) return { error: "invalid slug" as const };
  const publishedOn = dateOf(record.publishedOn);
  if (!publishedOn) return { error: "invalid date" as const };
  const title = {} as Copy;
  const description = {} as Copy;
  for (const locale of locales) {
    const source = record.title;
    const value = text(typeof source === "object" && source !== null ? (source as Record<string, unknown>)[locale] : undefined);
    if (!value) return { error: "invalid title" as const };
    title[locale] = value;
  }
  for (const locale of locales) {
    const source = record.description;
    const value = text(typeof source === "object" && source !== null ? (source as Record<string, unknown>)[locale] : undefined);
    if (!value) return { error: "invalid description" as const };
    description[locale] = value;
  }
  return { slug, publishedOn, title, description };
}

function present(
  article: { id: string; slug: string; publishedOn: string; deletedAt: Date | null },
  localeRows: { locale: Locale; title: string; description: string; body: string }[],
): AdminPost {
  const title = {} as Copy;
  const description = {} as Copy;
  const bodies: string[] = [];
  for (const locale of locales) {
    const row = localeRows.find((item) => item.locale === locale);
    title[locale] = row?.title ?? "";
    description[locale] = row?.description ?? "";
    bodies.push(row?.body ?? "");
  }
  const state = bodies.some((body) => body.trim() === "") ? "empty" : article.deletedAt ? "hidden" : "live";
  return { id: article.id, slug: article.slug, publishedOn: article.publishedOn, title, description, state };
}

async function loadPost(db: TestDatabase, id: string) {
  const [article] = await db.select().from(articles).where(eq(articles.id, id));
  if (!article) return null;
  const localeRows = await db.select().from(articleLocales).where(eq(articleLocales.articleId, id));
  return present(article, localeRows);
}

async function ownerOf(db: TestDatabase, slug: string) {
  const [article] = await db.select({ id: articles.id }).from(articles).where(eq(articles.slug, slug));
  if (article) return article.id;
  const [redirect] = await db
    .select({ articleId: articleSlugRedirects.articleId })
    .from(articleSlugRedirects)
    .where(eq(articleSlugRedirects.slug, slug));
  return redirect?.articleId ?? null;
}

async function writeCopy(db: TestDatabase, id: string, title: Copy, description: Copy) {
  for (const locale of locales) {
    await db
      .update(articleLocales)
      .set({ title: title[locale], description: description[locale] })
      .where(and(eq(articleLocales.articleId, id), eq(articleLocales.locale, locale)));
  }
}

export async function listAdminPosts(db: TestDatabase, session: ReaderSession) {
  const blocked = denied(session);
  if (blocked) return blocked;
  const rows = await db.select().from(articles).orderBy(desc(articles.publishedOn), asc(articles.slug));
  const localeRows = await db.select().from(articleLocales);
  return {
    status: 200 as const,
    body: { posts: rows.map((article) => present(article, localeRows.filter((row) => row.articleId === article.id))) },
  };
}

export async function createAdminPost(db: TestDatabase, session: ReaderSession, input: unknown) {
  const blocked = denied(session);
  if (blocked) return blocked;
  const parsed = fields(input);
  if ("error" in parsed) return { status: 400 as const, body: { message: parsed.error } };
  if (await ownerOf(db, parsed.slug)) return { status: 400 as const, body: { message: "slug taken" as const } };
  const [article] = await db.transaction(async (tx) => {
    const [created] = await tx.insert(articles).values({ slug: parsed.slug, publishedOn: parsed.publishedOn }).returning();
    await tx.insert(articleLocales).values(
      locales.map((locale) => ({
        articleId: created.id,
        locale,
        title: parsed.title[locale],
        description: parsed.description[locale],
        body: "",
      })),
    );
    return [created];
  });
  const post = await loadPost(db, article.id);
  if (!post) return { status: 404 as const, body: { message: "not found" as const } };
  return { status: 200 as const, body: { post } };
}

export async function updateAdminPost(db: TestDatabase, session: ReaderSession, id: string, input: unknown) {
  const blocked = denied(session);
  if (blocked) return blocked;
  const parsed = fields(input);
  if ("error" in parsed) return { status: 400 as const, body: { message: parsed.error } };
  const current = await loadPost(db, id);
  if (!current) return { status: 404 as const, body: { message: "not found" as const } };
  if (parsed.slug !== current.slug) {
    const owner = await ownerOf(db, parsed.slug);
    if (owner && owner !== id) return { status: 400 as const, body: { message: "slug taken" as const } };
    await db.transaction(async (tx) => {
      await tx.delete(articleSlugRedirects).where(and(eq(articleSlugRedirects.slug, parsed.slug), eq(articleSlugRedirects.articleId, id)));
      await tx.insert(articleSlugRedirects).values({ slug: current.slug, articleId: id });
      await tx.update(articles).set({ slug: parsed.slug, publishedOn: parsed.publishedOn, updatedAt: new Date() }).where(eq(articles.id, id));
      for (const locale of locales) {
        await tx
          .update(articleLocales)
          .set({ title: parsed.title[locale], description: parsed.description[locale] })
          .where(and(eq(articleLocales.articleId, id), eq(articleLocales.locale, locale)));
      }
    });
  } else {
    await db.update(articles).set({ publishedOn: parsed.publishedOn, updatedAt: new Date() }).where(eq(articles.id, id));
    await writeCopy(db, id, parsed.title, parsed.description);
  }
  const post = await loadPost(db, id);
  if (!post) return { status: 404 as const, body: { message: "not found" as const } };
  return { status: 200 as const, body: { post } };
}

export async function setAdminPostVisibility(db: TestDatabase, session: ReaderSession, id: string, active: unknown) {
  const blocked = denied(session);
  if (blocked) return blocked;
  if (typeof active !== "boolean") return { status: 400 as const, body: { message: "invalid visibility" as const } };
  const [article] = await db.select().from(articles).where(eq(articles.id, id));
  if (!article) return { status: 404 as const, body: { message: "not found" as const } };
  if ((article.deletedAt === null) === active) {
    const post = await loadPost(db, id);
    if (!post) return { status: 404 as const, body: { message: "not found" as const } };
    return { status: 200 as const, body: { post } };
  }
  await db
    .update(articles)
    .set({ deletedAt: active ? null : new Date(), updatedAt: new Date() })
    .where(eq(articles.id, id));
  const post = await loadPost(db, id);
  if (!post) return { status: 404 as const, body: { message: "not found" as const } };
  return { status: 200 as const, body: { post } };
}
```

Create `app/api/admin/posts/route.ts` with `reader()` copied from `app/api/admin/comments/route.ts`. Imports are four levels up (`../../../../src/auth`). `GET` calls `listAdminPosts(getDb(), await reader())`. `POST` parses JSON with `.catch(() => null)` and calls `createAdminPost`. Both return `Response.json(result.body, { status: result.status })`.

Create `app/api/admin/posts/[id]/route.ts`. Imports are five levels up. `PATCH` awaits `context.params` and calls `updateAdminPost(getDb(), await reader(), id, payload)`.

Create `app/api/admin/posts/[id]/visibility/route.ts`. Imports are six levels up. `POST` reads `{ active?: unknown } | null` and calls `setAdminPostVisibility(getDb(), await reader(), id, payload?.active)`.

- [ ] **Step 4: Run the admin post test and confirm it passes**

Run: `npx vitest run src/api/adminPosts.test.ts src/api/articles.test.ts --exclude '.worktrees/**'`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/api/adminPosts.ts src/api/adminPosts.test.ts app/api/admin/posts
git commit -m "$(cat <<'EOF'
Create, edit, and deactivate posts from the admin API.

EOF
)"
```

---

### Task 6: Show the posts screen

**Files:**
- Create: `src/admin/AdminPosts.tsx`
- Create: `src/admin/AdminPosts.test.tsx`
- Modify: `src/admin/AdminFrame.tsx`
- Modify: `src/admin/AdminHome.tsx`
- Create: `app/admin/posts/page.tsx`
- Test: `src/admin/AdminPosts.test.tsx`

**Interfaces:**
- Consumes: `AdminPost` JSON from `GET /api/admin/posts`, `POST /api/admin/posts`, `PATCH /api/admin/posts/:id`, and `POST /api/admin/posts/:id/visibility`. `AdminFrame` view gains `"posts"`. `AdminHome` accepts `view: "posts"` and uses `returnPath` `admin/posts`.
- Produces: `AdminPosts` and `app/admin/posts/page.tsx`, which renders `AdminHome` with `view="posts"`.

- [ ] **Step 1: Write the failing screen test**

Create `src/admin/AdminPosts.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminFrame } from "./AdminFrame";
import { AdminPosts } from "./AdminPosts";

const post = {
  id: "p1",
  slug: "nota",
  publishedOn: "2026-10-07",
  title: { pt: "Nota", en: "Note", es: "Nota" },
  description: { pt: "d", en: "d", es: "d" },
  state: "live" as const,
};

function json(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

it("shows the posts link and the three states", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      json({
        posts: [
          post,
          { ...post, id: "p2", slug: "oculto", state: "hidden" },
          { ...post, id: "p3", slug: "vazio", title: { pt: "", en: "", es: "Vazio" }, state: "empty" },
        ],
      }),
    ),
  );
  render(
    <AdminFrame view="posts">
      <AdminPosts />
    </AdminFrame>,
  );
  expect(screen.getByRole("link", { name: "Posts" })).toHaveAttribute("href", "/admin/posts");
  expect(await screen.findByText("No ar")).toBeInTheDocument();
  expect(screen.getByText("Oculto")).toBeInTheDocument();
  expect(screen.getByText("Sem corpo")).toBeInTheDocument();
  expect(screen.getByText("Vazio")).toBeInTheDocument();
});

it("shows the empty sentence", async () => {
  vi.stubGlobal("fetch", vi.fn(() => json({ posts: [] })));
  render(<AdminPosts />);
  expect(await screen.findByText("Não há posts.")).toBeInTheDocument();
});

it("shows the load error without a form", async () => {
  vi.stubGlobal("fetch", vi.fn(() => json({}, 500)));
  render(<AdminPosts />);
  expect(await screen.findByText("Não foi possível carregar.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Salvar" })).not.toBeInTheDocument();
});

it("keeps the form when saving fails", async () => {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "POST") return json({}, 500);
    return json({ posts: [] });
  });
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  render(<AdminPosts />);
  await user.click(await screen.findByRole("button", { name: "Novo post" }));
  await user.type(screen.getByLabelText("Slug"), "nota");
  await user.click(screen.getByRole("button", { name: "Salvar" }));
  expect(await screen.findByText("Não foi possível salvar.")).toBeInTheDocument();
  expect(screen.getByLabelText("Slug")).toHaveValue("nota");
});

it("returns from the form without saving", async () => {
  const fetchMock = vi.fn(() => json({ posts: [post] }));
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  render(<AdminPosts />);
  await user.click(await screen.findByRole("button", { name: "Novo post" }));
  await user.click(screen.getByRole("button", { name: "Voltar" }));
  expect(screen.getByText("Nota")).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("asks to deactivate a live post and leaves the row when that fails", async () => {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "POST") return json({}, 500);
    return json({ posts: [post] });
  });
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  render(<AdminPosts />);
  await user.click(await screen.findByRole("button", { name: "Desativar" }));
  expect(await screen.findByText("Não foi possível salvar.")).toBeInTheDocument();
  expect(screen.getByText("No ar")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the screen test and confirm it fails**

Run: `npx vitest run src/admin/AdminPosts.test.tsx --exclude '.worktrees/**'`

Expected: FAIL because `./AdminPosts` does not exist.

- [ ] **Step 3: Implement the screen, nav, and page**

Extend `AdminFrame` so `view` is `"report" | "comments" | "posts"`. Add a link `Posts` to `/admin/posts` with `aria-current="page"` when `view === "posts"`.

Extend `AdminHome` so `view` includes `"posts"`. `returnPath` is `admin` for `report`, `admin/comentarios` for `comments`, and `admin/posts` for `posts`. Render `AdminPosts` when `view === "posts"`.

Create `src/admin/AdminPosts.tsx` as a client component. Load `GET /api/admin/posts`. A failed response shows `Não foi possível carregar.` An empty `posts` array shows `Não há posts.` The `Novo post` button stays on that empty list. Otherwise render a table. Hide `Novo post` while the form is open. The title cell uses Portuguese, then English, then Spanish, then the slug. The state cell uses `No ar`, `Oculto`, or `Sem corpo`. Each row has `Editar` and either `Desativar` or `Ativar`.

`Novo post` and `Editar` replace the list with a form. Labels are `Slug`, `Data`, `Título em português`, `Título em inglês`, `Título em espanhol`, `Descrição em português`, `Descrição em inglês`, and `Descrição em espanhol`, each tied to its input with `htmlFor`. `Data` is `type="date"`. `Voltar` is `type="button"` and returns to the list without `fetch`. `Salvar` sends `POST /api/admin/posts` for a new post and `PATCH /api/admin/posts/${id}` for an edit, with JSON `{ slug, publishedOn, title, description }`. A failed response shows `Não foi possível salvar.` and leaves the inputs unchanged. A 200 response returns to the list using the returned post plus the posts already loaded, with the edited post replaced or the created post included.

`Ativar` and `Desativar` send `POST /api/admin/posts/${id}/visibility` with `{ active: true }` or `{ active: false }`. A failure shows `Não foi possível salvar.` and leaves the row. A 200 response replaces that post.

Create `app/admin/posts/page.tsx` by copying `app/admin/comentarios/page.tsx` without `searchParams`. Render `<AdminHome role={role} view="posts" />`.

- [ ] **Step 4: Run the screen test and confirm it passes**

Run: `npx vitest run src/admin/AdminPosts.test.tsx src/admin/AdminGate.test.tsx src/admin/AdminReport.test.tsx --exclude '.worktrees/**'`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/admin/AdminPosts.tsx src/admin/AdminPosts.test.tsx src/admin/AdminFrame.tsx src/admin/AdminHome.tsx app/admin/posts/page.tsx
git commit -m "$(cat <<'EOF'
Show the post list and form on the admin posts page.

EOF
)"
```

---

### Task 7: Open a former URL on the current slug

**Files:**
- Modify: `src/screens/ArticlePage.tsx`
- Modify: `src/screens/ArticlePage.test.tsx`
- Modify: `app/[[...path]]/page.tsx`
- Test: `src/screens/ArticlePage.test.tsx`

**Interfaces:**
- Consumes: `LoadedContent.redirects`, `getArticleBySlug`
- Produces: `ArticlePage` calls `navigate(\`/${redirect.to}\`, { replace: true })` when the route slug is not an article and `redirects` has that `from`. The catch-all page calls `permanentRedirect(\`/${slug}\`)` when `getArticleBySlug` returns 301.

- [ ] **Step 1: Write the failing page test**

Inside the existing `describe("Article")` block in `src/screens/ArticlePage.test.tsx`, add:

```tsx
it("replaces a former slug with the live article", async () => {
  const content: LoadedContent = {
    errors: [],
    articles: [
      {
        slug: "nota-nova",
        date: "2026-10-07",
        tags: [],
        locales: {
          pt: { title: "Nota nova", description: "d", markdown: "nota-nova.pt.md" },
          en: { title: "New note", description: "d", markdown: "nota-nova.en.md" },
          es: { title: "Nota nueva", description: "d", markdown: "nota-nova.es.md" },
        },
      },
    ],
    markdown: { "nota-nova.pt.md": "corpo novo", "nota-nova.en.md": "new body", "nota-nova.es.md": "cuerpo nuevo" },
    flashcards: {},
    redirects: [{ from: "nota", to: "nota-nova" }],
  };
  await renderAt("/nota", content);
  expect(await screen.findByText("corpo novo")).toBeInTheDocument();
  expect(screen.queryByText("Artigo não encontrado")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the article page test and confirm it fails**

Run: `npx vitest run src/screens/ArticlePage.test.tsx --exclude '.worktrees/**'`

Expected: FAIL because `/nota` renders the not-found page.

- [ ] **Step 3: Replace the old URL in the client and on the server**

In `ArticlePage`, find `content.redirects` for the route slug. When the slug is not in `content.articles` and a redirect exists, call `navigate(\`/${redirect.to}\`, { replace: true })` from an effect and render nothing until the next location. When no redirect exists, keep `NotFoundPage`.

In `app/[[...path]]/page.tsx`, accept `params: Promise<{ path?: string[] }>`. When `path` has one segment, call `getArticleBySlug(getDb(), path[0])`. When the status is 301, call `permanentRedirect` from `next/navigation` with `/${found.body.slug}` before rendering `ArticlesShell`. Otherwise keep the current `getArticleList` render.

- [ ] **Step 4: Run the article page test and the admin suite**

Run: `npx vitest run src/screens/ArticlePage.test.tsx src/admin src/api/adminPosts.test.ts src/api/articles.test.ts src/db/catalog.test.ts src/db/seedCatalog.test.ts src/db/schema.test.ts --exclude '.worktrees/**'`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/screens/ArticlePage.tsx src/screens/ArticlePage.test.tsx app/[[...path]]/page.tsx
git commit -m "$(cat <<'EOF'
Replace an old article URL with the current slug.

EOF
)"
```
