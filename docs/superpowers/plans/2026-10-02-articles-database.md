# Articles Database Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store articles, people, comments, and reactions in Neon and serve the existing blog from that database, with GitHub/LinkedIn login and reaction controls on the article page.

**Architecture:** Drizzle owns the Postgres schema. A seed copies the current files into Neon without clearing `deleted_at`. Pages and `/api/articles` share one query that maps rows back to `LoadedContent`. Auth.js creates a `users` row plus an `identities` row. Reaction and comment routes call database functions that tests exercise on PGlite.

**Tech Stack:** Next.js 15 route handlers, Drizzle ORM, Neon serverless driver, Auth.js, PGlite in Vitest, existing React article page.

## Global Constraints

- `DATABASE_URL` is server-only. Login secrets are `AUTH_SECRET`, `GITHUB_ID`, `GITHUB_SECRET`, `LINKEDIN_ID`, `LINKEDIN_SECRET`. None use a public prefix.
- Comment `body` is text with a maximum of 4000 characters. Empty text is rejected.
- Reaction types are exactly `like`, `celebrate`, `support`, `love`, `insightful`, `funny`.
- Reaction labels: like Gostei/Like/Me gusta, celebrate Parabéns/Celebrate/Celebrar, support Apoio/Support/Apoyar, love Amei/Love/Me encanta, insightful Genial/Insightful/Instructivo, funny Divertido/Funny/Divertido.
- Comment status is exactly `pending`, `approved`, or `rejected`. A new comment is `pending`.
- Locales are exactly `pt`, `en`, and `es`.
- The GitHub username `tiagocosmai` creates `role = admin`. A second network is stored only when a session already exists.
- Public article routes stay `/` and `/:slug`. An article with `deleted_at` is absent from public reads.
- Do not build the comment form, the comment list on the article page, the moderation screen, or automatic publishing.
- Commits set `GIT_AUTHOR_NAME='Tiago Cosmai'`, `GIT_AUTHOR_EMAIL='tiagocosmai@gmail.com'`, `GIT_COMMITTER_NAME='Tiago Cosmai'`, and `GIT_COMMITTER_EMAIL='tiagocosmai@gmail.com'`. Do not change git config.
- Tests run with `npx vitest run --exclude .worktrees/**`.

---

### Task 1: Schema and test database

**Files:**
- Create: `src/db/schema.ts`
- Create: `src/db/testDb.ts`
- Create: `src/db/schema.test.ts`
- Create: `drizzle.config.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing
- Produces: tables `users`, `identities`, `articles`, `article_locales`, `tags`, `tag_locales`, `article_tags`, `flashcards`, `comments`, `reactions`; `createTestDb(): Promise<TestDatabase>`

- [ ] **Step 1: Install the database packages**

Run:

```bash
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit @electric-sql/pglite
```

- [ ] **Step 2: Write the failing schema test**

Create `src/db/schema.test.ts`:

```ts
import { eq } from "drizzle-orm";
import { articles, reactions, users } from "./schema";
import { createTestDb } from "./testDb";

it("allows one active reaction of each type and a new row after soft delete", async () => {
  const db = await createTestDb();
  const [user] = await db.insert(users).values({ name: "Ada" }).returning();
  const [article] = await db
    .insert(articles)
    .values({ slug: "o-agente-secreto", publishedOn: "2026-09-24" })
    .returning();
  await db.insert(reactions).values({
    articleId: article.id,
    userId: user.id,
    type: "like",
  });
  await expect(
    db.insert(reactions).values({
      articleId: article.id,
      userId: user.id,
      type: "like",
    }),
  ).rejects.toThrow();
  await db
    .update(reactions)
    .set({ deletedAt: new Date() })
    .where(eq(reactions.userId, user.id));
  await db.insert(reactions).values({
    articleId: article.id,
    userId: user.id,
    type: "like",
  });
  await db.insert(reactions).values({
    articleId: article.id,
    userId: user.id,
    type: "love",
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/db/schema.test.ts --exclude .worktrees/**`

Expected: FAIL because `./schema` and `./testDb` do not exist.

- [ ] **Step 4: Write the schema, the Drizzle config, and the test database**

Create `src/db/schema.ts` with enums `user_role`, `locale`, `identity_provider`, `comment_status`, and `reaction_type` using the exact values in Global Constraints. Columns use snake_case names and camelCase fields: `createdAt`, `updatedAt`, `deletedAt`, `publishedOn`, `articleId`, `userId`, `parentId`, `providerAccountId`, `providerUsername`.

`reactions` has this partial unique index:

```ts
uniqueIndex("reactions_active_unique")
  .on(table.userId, table.articleId, table.type)
  .where(sql`${table.deletedAt} is null`);
```

`identities` is unique on `(provider, providerAccountId)` and on `(userId, provider)`. `articles.slug` is unique. `article_locales` is unique on `(articleId, locale)`. `tags.code` is unique. `tag_locales` is unique on `(tagId, locale)`. `article_tags` primary key is `(articleId, tagId)`. `flashcards` is unique on `(articleId, locale, code)`. `comments.parentId` references `comments.id`.

Create `drizzle.config.ts`:

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "postgres://localhost/articles" },
});
```

Create `src/db/testDb.ts` that opens a PGlite database, wraps it with `drizzle(client, { schema })`, runs `migrate(db, { migrationsFolder: "drizzle" })`, and returns that database.

Generate SQL:

```bash
npx drizzle-kit generate --name init
```

Expected: a new file under `drizzle/` whose SQL creates all ten tables and `reactions_active_unique`.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/db/schema.test.ts --exclude .worktrees/**`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/db/schema.ts src/db/schema.test.ts src/db/testDb.ts drizzle.config.ts drizzle
GIT_AUTHOR_NAME='Tiago Cosmai' GIT_AUTHOR_EMAIL='tiagocosmai@gmail.com' GIT_COMMITTER_NAME='Tiago Cosmai' GIT_COMMITTER_EMAIL='tiagocosmai@gmail.com' git commit -m "Add the Neon schema for articles, people, comments, and reactions."
```

### Task 2: Map database rows to the catalog the pages already use

**Files:**
- Create: `src/db/catalog.ts`
- Create: `src/db/catalog.test.ts`

**Interfaces:**
- Consumes: `createTestDb`, tables from `src/db/schema.ts`, `LoadedContent` from `src/types/content.ts`
- Produces: `readPublishedCatalog(db): Promise<LoadedContent>`

The mapper fills `article.locales[locale].markdown` with `${slug}.${locale}.md`, puts the Markdown body in `content.markdown` under that name, and puts flashcards in `content.flashcards` under `${slug}.${locale}.json`. `content.errors` is `[]`. `article.date` is `published_on` as `YYYY-MM-DD`. `article.tags` is `{ id: tag.code, pt, en, es }` ordered by `article_tags.position`.

- [ ] **Step 1: Write the failing test**

```ts
import { articles, articleLocales, articleTags, flashcards, tagLocales, tags } from "./schema";
import { createTestDb } from "./testDb";
import { readPublishedCatalog } from "./catalog";

it("hides a deleted article and rebuilds the catalog shape", async () => {
  const db = await createTestDb();
  const [visible] = await db.insert(articles).values({ slug: "visivel", publishedOn: "2026-09-26" }).returning();
  const [hidden] = await db.insert(articles).values({
    slug: "oculto",
    publishedOn: "2026-09-01",
    deletedAt: new Date(),
  }).returning();
  const [tag] = await db.insert(tags).values({ code: "AI" }).returning();
  await db.insert(tagLocales).values([
    { tagId: tag.id, locale: "pt", label: "IA" },
    { tagId: tag.id, locale: "en", label: "AI" },
    { tagId: tag.id, locale: "es", label: "IA" },
  ]);
  for (const article of [visible, hidden]) {
    await db.insert(articleLocales).values([
      { articleId: article.id, locale: "pt", title: "PT", description: "d", body: "corpo" },
      { articleId: article.id, locale: "en", title: "EN", description: "d", body: "body" },
      { articleId: article.id, locale: "es", title: "ES", description: "d", body: "cuerpo" },
    ]);
    await db.insert(articleTags).values({ articleId: article.id, tagId: tag.id, position: 0 });
    await db.insert(flashcards).values({
      articleId: article.id,
      locale: "pt",
      code: "card",
      front: "frente",
      back: "verso",
      position: 0,
    });
  }
  const content = await readPublishedCatalog(db);
  expect(content.errors).toEqual([]);
  expect(content.articles.map((article) => article.slug)).toEqual(["visivel"]);
  expect(content.articles[0].tags).toEqual([{ id: "AI", pt: "IA", en: "AI", es: "IA" }]);
  expect(content.markdown["visivel.pt.md"]).toBe("corpo");
  expect(content.flashcards["visivel.pt.json"]).toEqual([{ id: "card", front: "frente", back: "verso" }]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/db/catalog.test.ts --exclude .worktrees/**`

Expected: FAIL because `readPublishedCatalog` is not defined.

- [ ] **Step 3: Implement `readPublishedCatalog`**

Query articles where `deletedAt` is null, ordered by `publishedOn` descending and then `slug` ascending. Load locales, tag links, tag labels, and flashcards for those ids. Assemble `LoadedContent` with the filename rules above. Omit an article from the result when any of the three locales is missing.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/db/catalog.test.ts --exclude .worktrees/**`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/db/catalog.ts src/db/catalog.test.ts
GIT_AUTHOR_NAME='Tiago Cosmai' GIT_AUTHOR_EMAIL='tiagocosmai@gmail.com' GIT_COMMITTER_NAME='Tiago Cosmai' GIT_COMMITTER_EMAIL='tiagocosmai@gmail.com' git commit -m "Read the published catalog from the database."
```

### Task 3: Seed the current files without duplicating or restoring deletions

**Files:**
- Create: `src/db/seedCatalog.ts`
- Create: `src/db/seedCatalog.test.ts`

**Interfaces:**
- Consumes: `loadCatalog()` from `src/content/loadCatalog.ts`, `LoadedContent`, `createTestDb`
- Produces: `seedCatalog(db, content: LoadedContent): Promise<void>`

- [ ] **Step 1: Write the failing test**

```ts
import { eq } from "drizzle-orm";
import { articles } from "./schema";
import { createTestDb } from "./testDb";
import { readPublishedCatalog } from "./catalog";
import { seedCatalog } from "./seedCatalog";
import type { LoadedContent } from "../types/content";

const content: LoadedContent = {
  errors: [],
  articles: [{
    slug: "o-agente-secreto",
    date: "2026-09-24",
    tags: [{ id: "AI", pt: "IA", en: "AI", es: "IA" }],
    locales: {
      pt: { title: "PT", description: "d", markdown: "o-agente-secreto.pt.md" },
      en: { title: "EN", description: "d", markdown: "o-agente-secreto.en.md" },
      es: { title: "ES", description: "d", markdown: "o-agente-secreto.es.md" },
    },
  }],
  markdown: {
    "o-agente-secreto.pt.md": "corpo",
    "o-agente-secreto.en.md": "body",
    "o-agente-secreto.es.md": "cuerpo",
  },
  flashcards: {
    "o-agente-secreto.pt.json": [{ id: "card", front: "frente", back: "verso" }],
  },
};

it("updates an existing slug and keeps deleted_at", async () => {
  const db = await createTestDb();
  await seedCatalog(db, content);
  await seedCatalog(db, content);
  const rows = await db.select().from(articles).where(eq(articles.slug, "o-agente-secreto"));
  expect(rows).toHaveLength(1);
  await db.update(articles).set({ deletedAt: new Date("2026-10-02T00:00:00Z") }).where(eq(articles.slug, "o-agente-secreto"));
  await seedCatalog(db, content);
  const [row] = await db.select().from(articles).where(eq(articles.slug, "o-agente-secreto"));
  expect(row.deletedAt).not.toBeNull();
  expect(await readPublishedCatalog(db)).toMatchObject({ articles: [] });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/db/seedCatalog.test.ts --exclude .worktrees/**`

Expected: FAIL because `seedCatalog` is not defined.

- [ ] **Step 3: Implement the seed**

`seedCatalog` upserts each tag by `code` and each tag locale by `(tagId, locale)`. For each article it upserts by `slug`. On conflict it updates `publishedOn` and does not write `deletedAt`. It replaces that article's locale rows, tag links, and flashcards with the file contents. Flashcard files that are absent become no cards for that locale. The command that runs this against Neon is added with `getDb` in Task 4.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/db/seedCatalog.test.ts --exclude .worktrees/**`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/db/seedCatalog.ts src/db/seedCatalog.test.ts
GIT_AUTHOR_NAME='Tiago Cosmai' GIT_AUTHOR_EMAIL='tiagocosmai@gmail.com' GIT_COMMITTER_NAME='Tiago Cosmai' GIT_COMMITTER_EMAIL='tiagocosmai@gmail.com' git commit -m "Seed the database from the article files."
```

### Task 4: Public article endpoints and the page read path

**Files:**
- Create: `src/db/client.ts`
- Create: `src/db/seed.ts`
- Create: `src/api/articles.ts`
- Create: `src/api/articles.test.ts`
- Create: `app/api/articles/route.ts`
- Create: `app/api/articles/[slug]/route.ts`
- Modify: `app/[[...path]]/page.tsx`
- Modify: `package.json` scripts with `"db:seed": "tsx src/db/seed.ts"`
- Modify: `package.json` devDependencies with `tsx`

**Interfaces:**
- Consumes: `readPublishedCatalog`
- Produces: `getDb()`, `getArticleList(db)`, `getArticleBySlug(db, slug)` returning `{ status: number; body: unknown }`

- [ ] **Step 1: Write the failing test**

```ts
import { seedCatalog } from "../db/seedCatalog";
import { createTestDb } from "../db/testDb";
import { getArticleBySlug, getArticleList } from "./articles";

it("returns 404 for a missing or deleted slug and 200 for a visible one", async () => {
  const db = await createTestDb();
  const list = await getArticleList(db);
  expect(list).toEqual({
    status: 200,
    body: { articles: [], errors: [], markdown: {}, flashcards: {} },
  });
  expect(await getArticleBySlug(db, "ausente")).toEqual({
    status: 404,
    body: { message: "not found" },
  });
});
```

Extend the same test after a `seedCatalog` of one article: the list status is 200 and includes that slug; `getArticleBySlug` for that slug is 200 and includes `markdown["slug.pt.md"]`. After setting `deletedAt`, both the list and the slug return the article as absent (list length 0, slug status 404).

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/api/articles.test.ts --exclude .worktrees/**`

Expected: FAIL because `./articles` does not exist.

- [ ] **Step 3: Implement the client, the handlers, and the routes**

`getDb` uses `Pool` and `drizzle` from `drizzle-orm/neon-serverless`. It throws `Error("DATABASE_URL is required")` when the variable is missing.

`getArticleList` returns `{ status: 200, body: await readPublishedCatalog(db) }`. `getArticleBySlug` finds the slug inside that catalog. Missing means `{ status: 404, body: { message: "not found" } }`. Found means `{ status: 200, body: { article, markdown, flashcards } }` containing only that article's keys.

`src/db/seed.ts` calls `loadCatalog()`, prints `reportCatalogErrors`, exits 1 when `errors` is not empty, and otherwise calls `seedCatalog(getDb(), content)`. Install `tsx` and add the `db:seed` script.

`app/api/articles/route.ts` and `app/api/articles/[slug]/route.ts` call those functions with `getDb()` and return `Response.json(body, { status })`.

Change `app/[[...path]]/page.tsx` to an async server component:

```tsx
import { getArticleList } from "../../src/api/articles";
import { getDb } from "../../src/db/client";
import { ArticlesShell } from "../../src/ArticlesShell";

export const runtime = "nodejs";

export default async function Page() {
  const result = await getArticleList(getDb());
  return <ArticlesShell content={result.body} />;
}
```

`result.body` for the list is a `LoadedContent`. Keep `loadCatalog` for the seed and the existing file tests.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/api/articles.test.ts src/content/loadCatalog.test.ts --exclude .worktrees/**`

Expected: PASS. The file catalog test still loads the two real articles from disk.

- [ ] **Step 5: Commit**

```bash
git add src/db/client.ts src/db/seed.ts src/api/articles.ts src/api/articles.test.ts app/api/articles app/[[...path]]/page.tsx package.json package-lock.json
GIT_AUTHOR_NAME='Tiago Cosmai' GIT_AUTHOR_EMAIL='tiagocosmai@gmail.com' GIT_COMMITTER_NAME='Tiago Cosmai' GIT_COMMITTER_EMAIL='tiagocosmai@gmail.com' git commit -m "Serve the published catalog from the database."
```

### Task 5: Sign in with GitHub or LinkedIn

**Files:**
- Create: `src/db/users.ts`
- Create: `src/db/users.test.ts`
- Create: `src/auth.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Modify: `package.json` dependencies with `next-auth@5`

**Interfaces:**
- Consumes: `users`, `identities`, `createTestDb`
- Produces: `signInIdentity(db, input): Promise<{ userId: string; role: "member" | "admin"; name: string }>`

`input` is `{ provider: "github" | "linkedin"; providerAccountId: string; providerUsername: string | null; name: string; email: string | null; currentUserId: string | null }`.

- [ ] **Step 1: Write the failing test**

```ts
import { signInIdentity } from "./users";
import { createTestDb } from "./testDb";

const github = {
  provider: "github" as const,
  providerAccountId: "1",
  providerUsername: "tiagocosmai",
  name: "Tiago",
  email: "tiagocosmai@gmail.com",
  currentUserId: null,
};

it("makes tiagocosmai an admin and links LinkedIn onto that user", async () => {
  const db = await createTestDb();
  const first = await signInIdentity(db, github);
  expect(first.role).toBe("admin");
  const renamed = await signInIdentity(db, { ...github, name: "Tiago Cosmai" });
  expect(renamed).toMatchObject({ userId: first.userId, name: "Tiago Cosmai", role: "admin" });
  const linked = await signInIdentity(db, {
    provider: "linkedin",
    providerAccountId: "ln-9",
    providerUsername: null,
    name: "Tiago Cosmai",
    email: "tiagocosmai@gmail.com",
    currentUserId: first.userId,
  });
  expect(linked.userId).toBe(first.userId);
});
```

Add a second test: a LinkedIn sign-in with `currentUserId: null` creates a different `member` user. A second GitHub identity inserted while that member is the `currentUserId` stays on that member and does not become admin.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/db/users.test.ts --exclude .worktrees/**`

Expected: FAIL because `signInIdentity` is not defined.

- [ ] **Step 3: Implement sign-in and the Auth.js route**

When the identity exists, update that user's `name` and return the existing id and role. When it does not exist and `currentUserId` is set, insert the identity on that user. When `currentUserId` is null, insert a user whose role is `admin` only for GitHub username `tiagocosmai`, then insert the identity.

Install `next-auth@5`. `src/auth.ts` exports Auth.js with the secret and provider ids from Global Constraints:

```ts
providers: [
  GitHub({ clientId: process.env.GITHUB_ID, clientSecret: process.env.GITHUB_SECRET }),
  LinkedIn({ clientId: process.env.LINKEDIN_ID, clientSecret: process.env.LINKEDIN_SECRET }),
],
secret: process.env.AUTH_SECRET,
```

The `signIn` callback calls `signInIdentity`. Pass `currentUserId` from the existing session when it exists; otherwise pass null. The session callback copies `userId` and `role` onto the session. `app/api/auth/[...nextauth]/route.ts` exports the Auth.js GET and POST handlers.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/db/users.test.ts --exclude .worktrees/**`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/db/users.ts src/db/users.test.ts src/auth.ts app/api/auth package.json package-lock.json
GIT_AUTHOR_NAME='Tiago Cosmai' GIT_AUTHOR_EMAIL='tiagocosmai@gmail.com' GIT_COMMITTER_NAME='Tiago Cosmai' GIT_COMMITTER_EMAIL='tiagocosmai@gmail.com' git commit -m "Sign in with GitHub or LinkedIn as one user."
```

### Task 6: Reaction storage, endpoints, and the article controls

**Files:**
- Create: `src/db/reactions.ts`
- Create: `src/api/reactions.ts`
- Create: `src/api/reactions.test.ts`
- Create: `app/api/articles/[slug]/reactions/route.ts`
- Create: `app/api/articles/[slug]/reactions/[type]/route.ts`
- Create: `src/components/ArticleReactions.tsx`
- Create: `src/components/ArticleReactions.test.tsx`
- Modify: `src/i18n/ui.ts`
- Modify: `src/screens/ArticlePage.tsx`

**Interfaces:**
- Consumes: `createTestDb`, `seedCatalog`, session shape `{ id: string; role: "member" | "admin"; name: string } | null`
- Produces: `getReactions(db, slug, session)`, `postReaction(db, slug, session, type)`, `deleteReaction(db, slug, session, type)` each returning `{ status: number; body: unknown }`

`getReactions` body is `{ reactions: { type: ReactionType; count: number; mine: boolean }[] }` with the six types in the order listed in Global Constraints. `mine` is false when `session` is null.

- [ ] **Step 1: Write the failing API test**

Cover, on a seeded visible article and a member session:

- GET with `session: null` returns six counts of 0 and `mine: false`.
- POST without session returns 401.
- POST `{ type: "like" }` returns 200 and the following GET shows `like` count 1 and `mine: true` for that session.
- POST `like` again returns 200 and the count stays 1.
- POST `love` makes the love count 1 while like stays 1.
- DELETE `like` makes the like count 0.
- POST `like` after that delete makes the count 1 again.
- POST `{ type: "nope" }` returns 400.
- POST against slug `ausente` returns 404.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/api/reactions.test.ts --exclude .worktrees/**`

Expected: FAIL because `./reactions` does not exist.

- [ ] **Step 3: Implement storage, routes, labels, and the component**

`postReaction` rejects an unknown type with 400 and a missing visible article with 404. For an active row of that user, article, and type, return 200 with that row. For a soft-deleted row, set `deletedAt` to null and `createdAt` to now. Otherwise insert.

`deleteReaction` sets `deletedAt` on the caller's active row. Missing row still returns 200.

The two route files read the session through `auth()` and delegate to these functions. POST reads JSON `{ type }`.

Add `reaction_like`, `reaction_celebrate`, `reaction_support`, `reaction_love`, `reaction_insightful`, and `reaction_funny` to `pt`, `en`, and `es` in `src/i18n/ui.ts` using the Global Constraints labels. Add `reaction_sign_in` as "Entrar para reagir" / "Sign in to react" / "Inicia sesión para reaccionar".

`ArticleReactions` receives `slug`, `summary` in the GET body shape, and `signedIn: boolean`. Each type is a button named by `t("reaction_<type>")`. The button text includes the count. `aria-pressed` follows `mine`. When `signedIn` is false, the click sets `window.location.href` to `/api/auth/signin?callbackUrl=` plus the current article path. When `signedIn` is true, a pressed button calls `DELETE /api/articles/${slug}/reactions/${type}` and an unpressed button calls `POST` with `{ type }`, then reloads the summary from GET.

Render `<ArticleReactions slug={article.slug} />` in `ArticlePage` after the header and before `MarkdownBody`. The component fetches the summary itself so the server catalog does not have to include reactions. In `src/screens/ArticlePage.test.tsx`, stub `global.fetch` before each render so it resolves the six reaction counts at 0 with `mine: false`. The existing article assertions stay the same.

Component test: render six buttons, the like count `2`, and `aria-pressed="true"` on like when `signedIn` and `mine` are true. Clicking like while `signedIn` is false assigns `/api/auth/signin?callbackUrl=/o-agente-secreto`.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/api/reactions.test.ts src/components/ArticleReactions.test.tsx src/screens/ArticlePage.test.tsx --exclude .worktrees/**`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/db/reactions.ts src/api/reactions.ts src/api/reactions.test.ts app/api/articles/[slug]/reactions src/components/ArticleReactions.tsx src/components/ArticleReactions.test.tsx src/i18n/ui.ts src/screens/ArticlePage.tsx
GIT_AUTHOR_NAME='Tiago Cosmai' GIT_AUTHOR_EMAIL='tiagocosmai@gmail.com' GIT_COMMITTER_NAME='Tiago Cosmai' GIT_COMMITTER_EMAIL='tiagocosmai@gmail.com' git commit -m "Show LinkedIn-style reactions on the article page."
```

### Task 7: Comment endpoints

**Files:**
- Create: `src/api/comments.ts`
- Create: `src/api/comments.test.ts`
- Create: `app/api/articles/[slug]/comments/route.ts`
- Create: `app/api/articles/[slug]/comments/[id]/route.ts`

**Interfaces:**
- Consumes: session shape from Task 6, `createTestDb`, `seedCatalog`, `signInIdentity`
- Produces: `postComment(db, slug, session, input)`, `getComments(db, slug, session)`, `deleteComment(db, slug, session, id)`

`input` is `{ body: string; parentId: string | null }`. A comment in a response has `id`, `body`, `status`, `parentId`, `userName`, `createdAt`, and `mine`.

- [ ] **Step 1: Write the failing test**

On a seeded article, with a member session:

- POST without session returns 401.
- POST `{ body: "   ", parentId: null }` returns 400.
- POST `{ body: "x".repeat(4001), parentId: null }` returns 400.
- POST `{ body: "Olá", parentId: null }` returns 201 and `status: "pending"`.
- GET with `session: null` returns `{ comments: [] }`.
- GET with the author session returns that pending comment.
- A second user GET does not include it.
- Set the comment to `approved` through the database. GET with `session: null` includes it.
- POST a reply whose `parentId` is that comment returns 201.
- POST a reply whose `parentId` is a random uuid returns 400.
- DELETE by the author returns 200. A later public GET does not include it.
- DELETE by another member returns 403.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/api/comments.test.ts --exclude .worktrees/**`

Expected: FAIL because `./comments` does not exist.

- [ ] **Step 3: Implement the handlers and routes**

Trim `body` before the length check. Insert `status: "pending"`. `getComments` returns approved, non-deleted comments for everyone, plus the session user's own non-deleted comments of any status. Order by `createdAt` ascending. `parentId` must reference a non-deleted comment of the same article. `deleteComment` sets `deletedAt` when `session.id` is the author or `session.role` is `admin`.

GET and POST live in `app/api/articles/[slug]/comments/route.ts`. DELETE lives in `app/api/articles/[slug]/comments/[id]/route.ts`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/api/comments.test.ts --exclude .worktrees/**`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/api/comments.ts src/api/comments.test.ts app/api/articles/[slug]/comments
GIT_AUTHOR_NAME='Tiago Cosmai' GIT_AUTHOR_EMAIL='tiagocosmai@gmail.com' GIT_COMMITTER_NAME='Tiago Cosmai' GIT_COMMITTER_EMAIL='tiagocosmai@gmail.com' git commit -m "Store comments that start pending moderation."
```

### Task 8: Admin gate and moderation endpoints

**Files:**
- Create: `src/api/adminComments.ts`
- Create: `src/api/adminComments.test.ts`
- Create: `app/api/admin/comments/route.ts`
- Create: `app/api/admin/comments/[id]/approve/route.ts`
- Create: `app/api/admin/comments/[id]/reject/route.ts`
- Create: `app/admin/page.tsx`

**Interfaces:**
- Consumes: session shape, `postComment`, `createTestDb`
- Produces: `listAdminComments(db, session)`, `approveComment(db, session, id)`, `rejectComment(db, session, id)`

- [ ] **Step 1: Write the failing test**

Create a pending comment as a member. `listAdminComments`, `approveComment`, and `rejectComment` with that member session return 403. With an admin session, the list includes the pending comment. Approve changes `status` to `approved`. Reject changes it to `rejected`. A comment with `deletedAt` is absent from the list.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/api/adminComments.test.ts --exclude .worktrees/**`

Expected: FAIL because `./adminComments` does not exist.

- [ ] **Step 3: Implement the admin API and the page**

Each function returns 401 when `session` is null and 403 when `role` is not `admin`. Approve and reject set `status` and `updatedAt`. The list filters `deletedAt` null and orders by `createdAt` ascending.

`app/admin/page.tsx` is a server component. It calls `auth()`. No session redirects to `/api/auth/signin?callbackUrl=/admin`. A session whose role is not `admin` returns a response with status 403 and the text `forbidden`. An admin session renders `<main><h1>{session.user.name}</h1></main>` and no comment list.

The three route files delegate to the functions above.

- [ ] **Step 4: Run the full test suite**

Run: `npx vitest run --exclude .worktrees/**`

Expected: PASS, including the existing catalog, filter, list, and page tests.

- [ ] **Step 5: Commit**

```bash
git add src/api/adminComments.ts src/api/adminComments.test.ts app/api/admin app/admin/page.tsx
GIT_AUTHOR_NAME='Tiago Cosmai' GIT_AUTHOR_EMAIL='tiagocosmai@gmail.com' GIT_COMMITTER_NAME='Tiago Cosmai' GIT_COMMITTER_EMAIL='tiagocosmai@gmail.com' git commit -m "Guard admin comment actions behind the admin role."
```
