# Admin Moderation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Tiago open `/admin` as one person from GitHub `tiagocosmai` or Gmail `tiagocosmai@gmail.com`, moderate comment status, delete comments, and read per-article comment and reaction counts.

**Architecture:** `signInIdentity` unifies the two allowlisted logins onto one `admin` user. `/admin` and `/admin/comentarios` share a gate that shows the existing login modal or the denial sentence. Report and comment actions are functions under `src/api`, called by `/api/admin/*`. Screens are client components that fetch those routes.

**Tech Stack:** Next.js 15 route handlers, Drizzle ORM, PGlite in Vitest, Auth.js session, existing `LoginPrompt` and `LocaleProvider`.

## Global Constraints

- Start from `origin/master`. The local `master` checkout does not contain auth, comments, or `/admin`.
- Only GitHub username `tiagocosmai` or Gmail `tiagocosmai@gmail.com` is `admin`. They are the same user. No other sign-in receives `admin`.
- GitHub username comparison is exact. Gmail comparison is the email trimmed and lowercased.
- `/admin` and `/admin/comentarios` use the same gate. Logged out shows the login modal and no admin data. Closing it stays on the gate. An admin session renders the route. Any other account shows `Esta conta não administra o blog.` and then navigates to `https://tiagocosmai.github.io/pt/blog`.
- API without a session returns 401. API with another role returns 403. Those responses do not use the page sentence.
- Comment status is exactly `pending`, `approved`, or `rejected`. Delete sets `deleted_at`. There is no restore.
- Reaction types are exactly `like`, `celebrate`, `support`, `love`, `insightful`, `funny`. Labels on the report are gostei, parabéns, apoio, amei, genial, divertido.
- Article title is Portuguese, then English, then Spanish, then the slug.
- Empty report or comment list says `Não há itens para o filtro atual.`
- Load failure says `Não foi possível carregar.` Save failure says `Não foi possível salvar.` Neither invents counts nor changes the row.
- Delete asks `Excluir este comentário?` before calling the API.
- The Gmail button still depends on `AUTH_PROVIDERS` including `gmail` plus `GMAIL_ID` and `GMAIL_SECRET`. Do not change that configuration here.
- Do not build post editing, scheduling, per-post comment or reaction switches, markdown upload, or LinkedIn copy text.
- Commits set `GIT_AUTHOR_NAME='Tiago Cosmai'`, `GIT_AUTHOR_EMAIL='tiagocosmai@gmail.com'`, `GIT_COMMITTER_NAME='Tiago Cosmai'`, and `GIT_COMMITTER_EMAIL='tiagocosmai@gmail.com'`. Do not change git config.
- Tests run with `npx vitest run --exclude .worktrees/**`.

---

### Task 1: Unify the two admin logins

**Files:**
- Modify: `src/db/users.ts`
- Modify: `src/db/users.test.ts`
- Test: `src/db/users.test.ts`

**Interfaces:**
- Consumes: `signInIdentity(db, input)`, `createTestDb()`
- Produces: `isAdminLogin(input): boolean`. `signInIdentity` still returns `{ userId: string; role: "member" | "admin"; name: string }`. Allowlisted GitHub and Gmail resolve to one admin user. A split Gmail user is merged into the GitHub admin: comments and reactions move, the Gmail identity moves, the duplicate user gets `deleted_at`, and the return value is the surviving admin id.

- [ ] **Step 1: Branch from the published app**

```bash
git fetch origin
git switch -c cursor/admin-moderation origin/master
```

Expected: the branch contains `src/db/users.ts` and `app/admin/page.tsx`. Untracked spec and plan files stay in the working tree.

- [ ] **Step 2: Write the failing identity tests**

Add these tests to `src/db/users.test.ts`. Keep the existing GitHub-plus-LinkedIn test. Replace `keeps a LinkedIn member when a later GitHub login is linked` with the two tests below. Add the imports `comments`, `identities`, `reactions`, `users` from `./schema`, `eq` from `drizzle-orm`, and `articles` is not required in this file.

```ts
it("does not attach the tiagocosmai GitHub login onto another member", async () => {
  const db = await createTestDb();
  const member = await signInIdentity(db, {
    provider: "linkedin",
    providerAccountId: "ln-1",
    providerUsername: null,
    name: "Ada",
    email: null,
    currentUserId: null,
  });
  const admin = await signInIdentity(db, {
    provider: "github",
    providerAccountId: "44",
    providerUsername: "tiagocosmai",
    name: "Tiago",
    email: null,
    currentUserId: member.userId,
  });
  expect(admin.role).toBe("admin");
  expect(admin.userId).not.toBe(member.userId);
  const again = await signInIdentity(db, { ...github, providerAccountId: "2" });
  expect(again.userId).toBe(admin.userId);
});

it("still links a non-admin GitHub account onto the current member", async () => {
  const db = await createTestDb();
  const member = await signInIdentity(db, {
    provider: "linkedin",
    providerAccountId: "ln-2",
    providerUsername: null,
    name: "Ada",
    email: null,
    currentUserId: null,
  });
  const linked = await signInIdentity(db, {
    provider: "github",
    providerAccountId: "88",
    providerUsername: "ada",
    name: "Ada",
    email: null,
    currentUserId: member.userId,
  });
  expect(linked).toMatchObject({ userId: member.userId, role: "member" });
});

it("attaches the admin Gmail onto the GitHub admin", async () => {
  const db = await createTestDb();
  const admin = await signInIdentity(db, github);
  const gmail = await signInIdentity(db, {
    provider: "gmail",
    providerAccountId: "google-1",
    providerUsername: null,
    name: "Tiago Cosmai",
    email: "  TiagoCosmai@Gmail.com ",
    currentUserId: null,
  });
  expect(gmail).toMatchObject({ userId: admin.userId, role: "admin", name: "Tiago Cosmai" });
});

it("creates the admin from Gmail and attaches GitHub afterwards", async () => {
  const db = await createTestDb();
  const gmail = await signInIdentity(db, {
    provider: "gmail",
    providerAccountId: "google-1",
    providerUsername: null,
    name: "Tiago",
    email: "tiagocosmai@gmail.com",
    currentUserId: null,
  });
  expect(gmail.role).toBe("admin");
  const githubLogin = await signInIdentity(db, { ...github, currentUserId: null });
  expect(githubLogin.userId).toBe(gmail.userId);
});

it("keeps another Gmail address as a member", async () => {
  const db = await createTestDb();
  const other = await signInIdentity(db, {
    provider: "gmail",
    providerAccountId: "google-2",
    providerUsername: null,
    name: "Ada",
    email: "ada@example.com",
    currentUserId: null,
  });
  expect(other.role).toBe("member");
});

it("merges a pre-existing admin Gmail user into the GitHub admin", async () => {
  const db = await createTestDb();
  const admin = await signInIdentity(db, github);
  const [duplicate] = await db.insert(users).values({ name: "Old", email: "tiagocosmai@gmail.com", role: "member" }).returning();
  const [article] = await db.insert(articles).values({ slug: "nota", publishedOn: "2026-10-01" }).returning();
  await db.insert(identities).values({
    userId: duplicate.id,
    provider: "gmail",
    providerAccountId: "google-old",
    providerUsername: null,
  });
  const [comment] = await db.insert(comments).values({
    articleId: article.id,
    userId: duplicate.id,
    body: "oi",
    status: "pending",
  }).returning();
  const [reaction] = await db.insert(reactions).values({
    articleId: article.id,
    userId: duplicate.id,
    type: "like",
  }).returning();

  const signedIn = await signInIdentity(db, {
    provider: "gmail",
    providerAccountId: "google-old",
    providerUsername: null,
    name: "Tiago",
    email: "tiagocosmai@gmail.com",
    currentUserId: null,
  });

  expect(signedIn.userId).toBe(admin.userId);
  const [movedComment] = await db.select().from(comments).where(eq(comments.id, comment.id));
  const [movedReaction] = await db.select().from(reactions).where(eq(reactions.id, reaction.id));
  const [gone] = await db.select().from(users).where(eq(users.id, duplicate.id));
  expect(movedComment.userId).toBe(admin.userId);
  expect(movedReaction.userId).toBe(admin.userId);
  expect(gone.deletedAt).toBeInstanceOf(Date);
});
```

Add `articles` to the schema import. The `github` fixture already exists in the file.

- [ ] **Step 3: Run the identity tests and confirm they fail**

Run: `npx vitest run src/db/users.test.ts --exclude .worktrees/**`

Expected: FAIL because the Gmail login creates a second member, and linking GitHub `tiagocosmai` while another member is logged in stays on that member.

- [ ] **Step 4: Replace `signInIdentity` and add the helpers**

In `src/db/users.ts`, import `isNull` and `sql` from `drizzle-orm`, and import `comments` and `reactions` beside `identities` and `users`. Leave `signInGuest`, `findVisitor`, and `signInVisitor` unchanged. Replace `signInIdentity` with the following.

```ts
const adminEmail = "tiagocosmai@gmail.com";

export function isAdminLogin(input: Pick<IdentityInput, "provider" | "providerUsername" | "email">): boolean {
  if (input.provider === "github" && input.providerUsername === "tiagocosmai") return true;
  return input.provider === "gmail" && input.email?.trim().toLowerCase() === adminEmail;
}

async function findGithubAdmin(db: TestDatabase) {
  const [row] = await db
    .select({ id: users.id })
    .from(identities)
    .innerJoin(users, eq(users.id, identities.userId))
    .where(and(eq(identities.provider, "github"), eq(identities.providerUsername, "tiagocosmai"), isNull(users.deletedAt)));
  return row ?? null;
}

async function findGmailAdmin(db: TestDatabase) {
  const [row] = await db
    .select({ id: users.id })
    .from(identities)
    .innerJoin(users, eq(users.id, identities.userId))
    .where(and(eq(identities.provider, "gmail"), sql`lower(trim(${users.email})) = ${adminEmail}`, isNull(users.deletedAt)));
  return row ?? null;
}

async function promote(db: TestDatabase, userId: string, name: string) {
  const [user] = await db
    .update(users)
    .set({ name, role: "admin", updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return { userId: user.id, role: user.role, name: user.name };
}

async function moveReactions(db: TestDatabase, fromId: string, toId: string) {
  const rows = await db.select().from(reactions).where(eq(reactions.userId, fromId));
  for (const reaction of rows) {
    if (reaction.deletedAt) {
      await db.update(reactions).set({ userId: toId }).where(eq(reactions.id, reaction.id));
      continue;
    }
    const [clash] = await db
      .select({ id: reactions.id })
      .from(reactions)
      .where(and(eq(reactions.userId, toId), eq(reactions.articleId, reaction.articleId), eq(reactions.type, reaction.type), isNull(reactions.deletedAt)));
    if (clash) {
      await db.update(reactions).set({ deletedAt: new Date() }).where(eq(reactions.id, reaction.id));
    } else {
      await db.update(reactions).set({ userId: toId }).where(eq(reactions.id, reaction.id));
    }
  }
}

async function mergeUserInto(db: TestDatabase, fromId: string, toId: string) {
  await db.update(comments).set({ userId: toId, updatedAt: new Date() }).where(eq(comments.userId, fromId));
  await moveReactions(db, fromId, toId);
  await db.update(identities).set({ userId: toId }).where(eq(identities.userId, fromId));
  await db.update(users).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, fromId));
}

export async function signInIdentity(db: TestDatabase, input: IdentityInput) {
  const adminLogin = isAdminLogin(input);
  const [existing] = await db
    .select()
    .from(identities)
    .where(and(eq(identities.provider, input.provider), eq(identities.providerAccountId, input.providerAccountId)));

  if (existing && adminLogin && input.provider === "gmail") {
    const githubAdmin = await findGithubAdmin(db);
    if (githubAdmin && githubAdmin.id !== existing.userId) {
      await mergeUserInto(db, existing.userId, githubAdmin.id);
      return promote(db, githubAdmin.id, input.name);
    }
  }

  if (existing) {
    const [user] = await db
      .update(users)
      .set({ name: input.name, ...(adminLogin ? { role: "admin" as const } : {}), updatedAt: new Date() })
      .where(eq(users.id, existing.userId))
      .returning();
    return { userId: user.id, role: user.role, name: user.name };
  }

  if (adminLogin) {
    const canonical = (await findGithubAdmin(db)) ?? (await findGmailAdmin(db));
    if (canonical) {
      await db.insert(identities).values({
        userId: canonical.id,
        provider: input.provider,
        providerAccountId: input.providerAccountId,
        providerUsername: input.providerUsername,
      });
      return promote(db, canonical.id, input.name);
    }
    const [user] = await db.insert(users).values({ name: input.name, email: input.email, role: "admin" }).returning();
    await db.insert(identities).values({
      userId: user.id,
      provider: input.provider,
      providerAccountId: input.providerAccountId,
      providerUsername: input.providerUsername,
    });
    return { userId: user.id, role: user.role, name: user.name };
  }

  if (input.currentUserId) {
    await db.insert(identities).values({
      userId: input.currentUserId,
      provider: input.provider,
      providerAccountId: input.providerAccountId,
      providerUsername: input.providerUsername,
    });
    const [user] = await db
      .update(users)
      .set({ name: input.name, updatedAt: new Date() })
      .where(eq(users.id, input.currentUserId))
      .returning();
    return { userId: user.id, role: user.role, name: user.name };
  }

  const [user] = await db.insert(users).values({ name: input.name, email: input.email, role: "member" }).returning();
  await db.insert(identities).values({
    userId: user.id,
    provider: input.provider,
    providerAccountId: input.providerAccountId,
    providerUsername: input.providerUsername,
  });
  return { userId: user.id, role: user.role, name: user.name };
}
```

- [ ] **Step 5: Run the identity tests and confirm they pass**

Run: `npx vitest run src/db/users.test.ts --exclude .worktrees/**`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/db/users.ts src/db/users.test.ts
GIT_AUTHOR_NAME='Tiago Cosmai' GIT_AUTHOR_EMAIL='tiagocosmai@gmail.com' GIT_COMMITTER_NAME='Tiago Cosmai' GIT_COMMITTER_EMAIL='tiagocosmai@gmail.com' git commit -m "$(cat <<'EOF'
Treat GitHub tiagocosmai and the admin Gmail as one administrator.

EOF
)"
```

---

### Task 2: Report counts per article

**Files:**
- Create: `src/api/adminReport.ts`
- Create: `src/api/adminReport.test.ts`
- Create: `app/api/admin/report/route.ts`
- Test: `src/api/adminReport.test.ts`

**Interfaces:**
- Consumes: `ReaderSession` from `src/api/reactions.ts`, `createTestDb`, `seedCatalog`, `signInIdentity`
- Produces: `getAdminReport(db, session)` returning `{ status: 401 | 403, body: { message: "unauthorized" | "forbidden" } }` or `{ status: 200, body: { articles: AdminReportArticle[] } }`

```ts
export type AdminReportArticle = {
  slug: string;
  title: string;
  publishedOn: string;
  comments: { pending: number; approved: number; rejected: number };
  reactions: {
    like: number;
    celebrate: number;
    support: number;
    love: number;
    insightful: number;
    funny: number;
  };
};
```

- [ ] **Step 1: Write the failing report test**

Create `src/api/adminReport.test.ts`:

```ts
// @vitest-environment node
import { eq } from "drizzle-orm";
import { articleLocales, articles, comments, reactions } from "../db/schema";
import { seedCatalog } from "../db/seedCatalog";
import { createTestDb } from "../db/testDb";
import { signInIdentity } from "../db/users";
import type { LoadedContent } from "../types/content";
import { getAdminReport } from "./adminReport";

const content: LoadedContent = {
  errors: [],
  articles: [
    {
      slug: "antigo",
      date: "2026-09-01",
      tags: [],
      locales: {
        pt: { title: "Antigo", description: "d", markdown: "antigo.pt.md" },
        en: { title: "Old", description: "d", markdown: "antigo.en.md" },
        es: { title: "Viejo", description: "d", markdown: "antigo.es.md" },
      },
    },
    {
      slug: "novo",
      date: "2026-10-01",
      tags: [],
      locales: {
        pt: { title: "", description: "d", markdown: "novo.pt.md" },
        en: { title: "New", description: "d", markdown: "novo.en.md" },
        es: { title: "Nuevo", description: "d", markdown: "novo.es.md" },
      },
    },
  ],
  markdown: {},
  flashcards: {},
};

it("counts visible comments and reactions for an admin", async () => {
  const db = await createTestDb();
  await seedCatalog(db, content);
  const member = await signInIdentity(db, {
    provider: "linkedin",
    providerAccountId: "ln-1",
    providerUsername: null,
    name: "Ada",
    email: null,
    currentUserId: null,
  });
  const admin = await signInIdentity(db, {
    provider: "github",
    providerAccountId: "1",
    providerUsername: "tiagocosmai",
    name: "Tiago",
    email: null,
    currentUserId: null,
  });
  const [oldArticle] = await db.select().from(articles).where(eq(articles.slug, "antigo"));
  const [newArticle] = await db.select().from(articles).where(eq(articles.slug, "novo"));
  await db.insert(comments).values([
    { articleId: oldArticle.id, userId: member.userId, body: "p", status: "pending" },
    { articleId: oldArticle.id, userId: member.userId, body: "a", status: "approved" },
    { articleId: oldArticle.id, userId: member.userId, body: "r", status: "rejected" },
    { articleId: oldArticle.id, userId: member.userId, body: "x", status: "approved", deletedAt: new Date() },
  ]);
  await db.insert(reactions).values([
    { articleId: oldArticle.id, userId: member.userId, type: "like" },
    { articleId: oldArticle.id, userId: admin.userId, type: "love" },
    { articleId: oldArticle.id, userId: admin.userId, type: "funny", deletedAt: new Date() },
  ]);
  await db.delete(articleLocales).where(eq(articleLocales.articleId, newArticle.id));
  await db.insert(articleLocales).values({
    articleId: newArticle.id,
    locale: "es",
    title: "Nuevo",
    description: "d",
    body: "",
  });

  expect((await getAdminReport(db, null)).status).toBe(401);
  expect((await getAdminReport(db, { id: member.userId, role: "member", name: "Ada" })).status).toBe(403);

  const report = await getAdminReport(db, { id: admin.userId, role: "admin", name: "Tiago" });
  expect(report.status).toBe(200);
  if (report.status !== 200) throw new Error("expected report");
  expect(report.body.articles.map((article) => article.slug)).toEqual(["novo", "antigo"]);
  expect(report.body.articles[0]).toMatchObject({
    title: "Nuevo",
    comments: { pending: 0, approved: 0, rejected: 0 },
    reactions: { like: 0, celebrate: 0, support: 0, love: 0, insightful: 0, funny: 0 },
  });
  expect(report.body.articles[1]).toMatchObject({
    title: "Antigo",
    comments: { pending: 1, approved: 1, rejected: 1 },
    reactions: { like: 1, celebrate: 0, support: 0, love: 1, insightful: 0, funny: 0 },
  });
});
```

- [ ] **Step 2: Run the report test and confirm it fails**

Run: `npx vitest run src/api/adminReport.test.ts --exclude .worktrees/**`

Expected: FAIL because `./adminReport` does not exist.

- [ ] **Step 3: Implement the report query and route**

Create `src/api/adminReport.ts`:

```ts
import { eq, isNull, sql } from "drizzle-orm";
import { articleLocales, articles, comments, reactions } from "../db/schema";
import type { TestDatabase } from "../db/testDb";
import type { ReaderSession } from "./reactions";

const reactionTypes = ["like", "celebrate", "support", "love", "insightful", "funny"] as const;
type ReactionType = (typeof reactionTypes)[number];

export type AdminReportArticle = {
  slug: string;
  title: string;
  publishedOn: string;
  comments: { pending: number; approved: number; rejected: number };
  reactions: Record<ReactionType, number>;
};

function gate(session: ReaderSession) {
  if (!session) return { status: 401 as const, body: { message: "unauthorized" as const } };
  if (session.role !== "admin") return { status: 403 as const, body: { message: "forbidden" as const } };
  return null;
}

function titleFor(slug: string, locales: { locale: string; title: string }[]) {
  const byLocale = new Map(locales.map((locale) => [locale.locale, locale.title.trim()]));
  return byLocale.get("pt") || byLocale.get("en") || byLocale.get("es") || slug;
}

function emptyReactions(): Record<ReactionType, number> {
  return { like: 0, celebrate: 0, support: 0, love: 0, insightful: 0, funny: 0 };
}

export async function getAdminReport(db: TestDatabase, session: ReaderSession) {
  const denied = gate(session);
  if (denied) return denied;
  const articleRows = await db
    .select({ id: articles.id, slug: articles.slug, publishedOn: articles.publishedOn })
    .from(articles)
    .where(isNull(articles.deletedAt));
  const localeRows = await db.select({ articleId: articleLocales.articleId, locale: articleLocales.locale, title: articleLocales.title }).from(articleLocales);
  const commentRows = await db
    .select({
      articleId: comments.articleId,
      status: comments.status,
      count: sql<number>`count(*)::int`,
    })
    .from(comments)
    .where(isNull(comments.deletedAt))
    .groupBy(comments.articleId, comments.status);
  const reactionRows = await db
    .select({
      articleId: reactions.articleId,
      type: reactions.type,
      count: sql<number>`count(*)::int`,
    })
    .from(reactions)
    .where(isNull(reactions.deletedAt))
    .groupBy(reactions.articleId, reactions.type);

  const articlesOut: AdminReportArticle[] = articleRows.map((article) => {
    const commentsCount = { pending: 0, approved: 0, rejected: 0 };
    for (const row of commentRows) {
      if (row.articleId !== article.id) continue;
      commentsCount[row.status] = Number(row.count);
    }
    const reactionCount = emptyReactions();
    for (const row of reactionRows) {
      if (row.articleId !== article.id) continue;
      reactionCount[row.type] = Number(row.count);
    }
    return {
      slug: article.slug,
      title: titleFor(article.slug, localeRows.filter((locale) => locale.articleId === article.id)),
      publishedOn: article.publishedOn,
      comments: commentsCount,
      reactions: reactionCount,
    };
  });
  articlesOut.sort((a, b) => b.publishedOn.localeCompare(a.publishedOn) || a.slug.localeCompare(b.slug));
  return { status: 200 as const, body: { articles: articlesOut } };
}
```

Create `app/api/admin/report/route.ts` by copying the session helper from `app/api/admin/comments/route.ts` and calling `getAdminReport`:

```ts
import { auth } from "../../../../src/auth";
import { getAdminReport } from "../../../../src/api/adminReport";
import type { ReaderSession } from "../../../../src/api/reactions";
import { getDb } from "../../../../src/db/client";

export const runtime = "nodejs";

async function reader(): Promise<ReaderSession> {
  const session = await auth();
  if (!session?.userId || (session.role !== "admin" && session.role !== "member")) return null;
  return { id: session.userId, role: session.role, name: session.user?.name ?? "" };
}

export async function GET() {
  const result = await getAdminReport(getDb(), await reader());
  return Response.json(result.body, { status: result.status });
}
```

- [ ] **Step 4: Run the report test and confirm it passes**

Run: `npx vitest run src/api/adminReport.test.ts --exclude .worktrees/**`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/api/adminReport.ts src/api/adminReport.test.ts app/api/admin/report/route.ts
GIT_AUTHOR_NAME='Tiago Cosmai' GIT_AUTHOR_EMAIL='tiagocosmai@gmail.com' GIT_COMMITTER_NAME='Tiago Cosmai' GIT_COMMITTER_EMAIL='tiagocosmai@gmail.com' git commit -m "$(cat <<'EOF'
Report comment and reaction counts for each article.

EOF
)"
```

---

### Task 3: Filter, retarget, and delete comments

**Files:**
- Modify: `src/api/adminComments.ts`
- Modify: `src/api/adminComments.test.ts`
- Modify: `app/api/admin/comments/route.ts`
- Create: `app/api/admin/comments/[id]/status/route.ts`
- Create: `app/api/admin/comments/[id]/route.ts`
- Delete: `app/api/admin/comments/[id]/approve/route.ts`
- Delete: `app/api/admin/comments/[id]/reject/route.ts`
- Test: `src/api/adminComments.test.ts`

**Interfaces:**
- Consumes: `ReaderSession`, `postComment`, `seedCatalog`
- Produces:
  - `AdminComment` with `id`, `articleSlug`, `articleTitle`, `authorName`, `createdAt`, `status`, `body`, `parentId`
  - `listAdminComments(db, session, filter?: { status?: string; article?: string })`
  - `setCommentStatus(db, session, id, status: string)`
  - `deleteAdminComment(db, session, id)`
  - Remove `approveComment` and `rejectComment`

- [ ] **Step 1: Rewrite the admin comment test**

Replace the body of `src/api/adminComments.test.ts` so it imports `deleteAdminComment`, `listAdminComments`, and `setCommentStatus` instead of `approveComment` and `rejectComment`. Keep the same `content` fixture and add a second article `outro` dated `2026-10-02` with titles `Outro` / `Other` / `Otro`. Inside the test, after creating the pending comment on `o-agente-secreto`:

```ts
expect((await listAdminComments(db, null)).status).toBe(401);
expect((await setCommentStatus(db, null, created.body.id, "approved")).status).toBe(401);
expect((await deleteAdminComment(db, null, created.body.id)).status).toBe(401);
expect((await listAdminComments(db, memberSession)).status).toBe(403);
expect((await setCommentStatus(db, memberSession, created.body.id, "approved")).status).toBe(403);
expect((await setCommentStatus(db, adminSession, created.body.id, "nope")).status).toBe(400);
expect((await setCommentStatus(db, adminSession, "00000000-0000-4000-8000-000000000000", "approved")).status).toBe(404);
expect((await deleteAdminComment(db, adminSession, "00000000-0000-4000-8000-000000000000")).status).toBe(404);
expect((await listAdminComments(db, adminSession, { status: "nope" })).status).toBe(400);

const listed = await listAdminComments(db, adminSession);
expect(listed.status).toBe(200);
if (listed.status !== 200) throw new Error("expected list");
expect(listed.body.comments[0]).toMatchObject({
  id: created.body.id,
  articleSlug: "o-agente-secreto",
  articleTitle: "PT",
  authorName: "Ada",
  status: "pending",
  body: "Olá",
  parentId: null,
});

await setCommentStatus(db, adminSession, created.body.id, "approved");
const same = await setCommentStatus(db, adminSession, created.body.id, "approved");
expect(same.status).toBe(200);
if (same.status !== 200) throw new Error("expected status");
expect(same.body.comment.status).toBe("approved");

await setCommentStatus(db, adminSession, created.body.id, "rejected");
await setCommentStatus(db, adminSession, created.body.id, "pending");

const [other] = await db.select().from(articles).where(eq(articles.slug, "outro"));
await db.insert(comments).values({
  articleId: other.id,
  userId: member.userId,
  body: "lá",
  status: "approved",
  createdAt: new Date("2026-10-05T12:00:00Z"),
});
const filtered = await listAdminComments(db, adminSession, { status: "approved", article: "outro" });
expect(filtered.status).toBe(200);
if (filtered.status !== 200) throw new Error("expected filter");
expect(filtered.body.comments.map((comment) => comment.body)).toEqual(["lá"]);

const missing = await listAdminComments(db, adminSession, { article: "nao-existe" });
expect(missing.status).toBe(200);
if (missing.status !== 200) throw new Error("expected empty");
expect(missing.body.comments).toEqual([]);

expect((await deleteAdminComment(db, adminSession, created.body.id)).status).toBe(200);
const afterDelete = await listAdminComments(db, adminSession);
if (afterDelete.status !== 200) throw new Error("expected list");
expect(afterDelete.body.comments.map((comment) => comment.id)).not.toContain(created.body.id);
expect((await deleteAdminComment(db, adminSession, created.body.id)).status).toBe(404);
```

Import `articles` and `comments` from the schema and `eq` from `drizzle-orm`. The visitor name stored by `postComment` is `Ada`.

After the first list assertion, insert a reply and expect it on the unfiltered list:

```ts
await db.insert(comments).values({
  articleId: (await db.select().from(articles).where(eq(articles.slug, "o-agente-secreto")))[0].id,
  userId: member.userId,
  parentId: created.body.id,
  body: "resposta",
  status: "pending",
});
const withReply = await listAdminComments(db, adminSession);
if (withReply.status !== 200) throw new Error("expected reply list");
expect(withReply.body.comments.find((comment) => comment.body === "resposta")?.parentId).toBe(created.body.id);
```

- [ ] **Step 2: Run the comment test and confirm it fails**

Run: `npx vitest run src/api/adminComments.test.ts --exclude .worktrees/**`

Expected: FAIL because `setCommentStatus` and `deleteAdminComment` are not exported.

- [ ] **Step 3: Implement list filters, status change, and delete**

Replace `src/api/adminComments.ts` with:

```ts
import { and, desc, eq, isNull } from "drizzle-orm";
import { articleLocales, articles, comments, users } from "../db/schema";
import type { TestDatabase } from "../db/testDb";
import type { ReaderSession } from "./reactions";

const commentStatuses = ["pending", "approved", "rejected"] as const;
type CommentStatus = (typeof commentStatuses)[number];

export type AdminComment = {
  id: string;
  articleSlug: string;
  articleTitle: string;
  authorName: string;
  createdAt: Date;
  status: CommentStatus;
  body: string;
  parentId: string | null;
};

export type CommentFilter = { status?: string; article?: string };

function gate(session: ReaderSession) {
  if (!session) return { status: 401 as const, body: { message: "unauthorized" as const } };
  if (session.role !== "admin") return { status: 403 as const, body: { message: "forbidden" as const } };
  return null;
}

function isStatus(value: string): value is CommentStatus {
  return commentStatuses.includes(value as CommentStatus);
}

function titleFor(slug: string, locales: { locale: string; title: string }[]) {
  const byLocale = new Map(locales.map((locale) => [locale.locale, locale.title.trim()]));
  return byLocale.get("pt") || byLocale.get("en") || byLocale.get("es") || slug;
}

function present(row: {
  id: string;
  body: string;
  status: CommentStatus;
  parentId: string | null;
  createdAt: Date;
  articleSlug: string;
  authorName: string;
  locales: { locale: string; title: string }[];
}): AdminComment {
  return {
    id: row.id,
    articleSlug: row.articleSlug,
    articleTitle: titleFor(row.articleSlug, row.locales),
    authorName: row.authorName,
    createdAt: row.createdAt,
    status: row.status,
    body: row.body,
    parentId: row.parentId,
  };
}

export async function listAdminComments(db: TestDatabase, session: ReaderSession, filter: CommentFilter = {}) {
  const denied = gate(session);
  if (denied) return denied;
  const status = filter.status?.trim() ?? "";
  if (status && !isStatus(status)) return { status: 400 as const, body: { message: "invalid status" as const } };
  const article = filter.article?.trim() ?? "";
  const rows = await db
    .select({
      id: comments.id,
      body: comments.body,
      status: comments.status,
      parentId: comments.parentId,
      createdAt: comments.createdAt,
      articleId: articles.id,
      articleSlug: articles.slug,
      authorName: users.name,
    })
    .from(comments)
    .innerJoin(articles, eq(articles.id, comments.articleId))
    .innerJoin(users, eq(users.id, comments.userId))
    .where(and(isNull(comments.deletedAt), ...(status ? [eq(comments.status, status)] : []), ...(article ? [eq(articles.slug, article)] : [])))
    .orderBy(desc(comments.createdAt), desc(comments.id));
  const localeRows = await db.select({
    articleId: articleLocales.articleId,
    locale: articleLocales.locale,
    title: articleLocales.title,
  }).from(articleLocales);
  return {
    status: 200 as const,
    body: {
      comments: rows.map((row) => present({ ...row, locales: localeRows.filter((locale) => locale.articleId === row.articleId) })),
    },
  };
}

async function visibleComment(db: TestDatabase, id: string) {
  const [row] = await db
    .select({
      id: comments.id,
      body: comments.body,
      status: comments.status,
      parentId: comments.parentId,
      createdAt: comments.createdAt,
      articleId: articles.id,
      articleSlug: articles.slug,
      authorName: users.name,
    })
    .from(comments)
    .innerJoin(articles, eq(articles.id, comments.articleId))
    .innerJoin(users, eq(users.id, comments.userId))
    .where(and(eq(comments.id, id), isNull(comments.deletedAt)));
  return row ?? null;
}

export async function setCommentStatus(db: TestDatabase, session: ReaderSession, id: string, status: string) {
  const denied = gate(session);
  if (denied) return denied;
  if (!isStatus(status)) return { status: 400 as const, body: { message: "invalid status" as const } };
  const current = await visibleComment(db, id);
  if (!current) return { status: 404 as const, body: { message: "not found" as const } };
  await db.update(comments).set({ status, updatedAt: new Date() }).where(eq(comments.id, id));
  const localeRows = await db.select({
    articleId: articleLocales.articleId,
    locale: articleLocales.locale,
    title: articleLocales.title,
  }).from(articleLocales).where(eq(articleLocales.articleId, current.articleId));
  return { status: 200 as const, body: { comment: present({ ...current, status, locales: localeRows }) } };
}

export async function deleteAdminComment(db: TestDatabase, session: ReaderSession, id: string) {
  const denied = gate(session);
  if (denied) return denied;
  const current = await visibleComment(db, id);
  if (!current) return { status: 404 as const, body: { message: "not found" as const } };
  await db.update(comments).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(comments.id, id));
  return { status: 200 as const, body: {} };
}
```

`createdAt` stays a `Date` in the function result. `Response.json` serializes it.

Replace the `GET` handler in `app/api/admin/comments/route.ts` with a function that reads the query and passes it through:

```ts
export async function GET(request: Request) {
  const url = new URL(request.url);
  const result = await listAdminComments(getDb(), await reader(), {
    status: url.searchParams.get("status") ?? undefined,
    article: url.searchParams.get("article") ?? undefined,
  });
  return Response.json(result.body, { status: result.status });
}
```

Create `app/api/admin/comments/[id]/status/route.ts`. Copy `reader()` from the old approve route. The handler is:

```ts
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const payload = (await request.json().catch(() => null)) as { status?: unknown } | null;
  const status = typeof payload?.status === "string" ? payload.status : "";
  const result = await setCommentStatus(getDb(), await reader(), id, status);
  return Response.json(result.body, { status: result.status });
}
```

Create `app/api/admin/comments/[id]/route.ts` with imports five levels up (`../../../../../src/auth`) and:

```ts
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const result = await deleteAdminComment(getDb(), await reader(), id);
  return Response.json(result.body, { status: result.status });
}
```

Delete `app/api/admin/comments/[id]/approve/route.ts` and `app/api/admin/comments/[id]/reject/route.ts`.

- [ ] **Step 4: Run the comment test and confirm it passes**

Run: `npx vitest run src/api/adminComments.test.ts --exclude .worktrees/**`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/api/adminComments.ts src/api/adminComments.test.ts app/api/admin/comments
GIT_AUTHOR_NAME='Tiago Cosmai' GIT_AUTHOR_EMAIL='tiagocosmai@gmail.com' GIT_COMMITTER_NAME='Tiago Cosmai' GIT_COMMITTER_EMAIL='tiagocosmai@gmail.com' git commit -m "$(cat <<'EOF'
Moderate comment status from one admin route and soft-delete from the list.

EOF
)"
```

---

### Task 4: Gate the admin pages

**Files:**
- Create: `src/admin/gate.ts`
- Create: `src/admin/AdminGate.tsx`
- Create: `src/admin/AdminGate.test.tsx`
- Test: `src/admin/AdminGate.test.tsx`

**Interfaces:**
- Consumes: `LoginPrompt`, `LocaleProvider`
- Produces:
  - `adminBlogHome = "https://tiagocosmai.github.io/pt/blog"`
  - `adminDeniedMessage = "Esta conta não administra o blog."`
  - `AdminGate({ role, returnPath, go, children })` where `role` is `"admin" | "member" | null`, `returnPath` is the `LoginPrompt` slug, and `go` defaults to `(url: string) => window.location.assign(url)`

- [ ] **Step 1: Write the failing gate test**

Create `src/admin/AdminGate.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminGate } from "./AdminGate";
import { adminBlogHome, adminDeniedMessage } from "./gate";

beforeEach(() => {
  localStorage.setItem("articles-locale", "pt");
});

it("shows the login modal and hides admin content when logged out", async () => {
  const user = userEvent.setup();
  render(
    <AdminGate role={null} returnPath="admin">
      <p>Relatório</p>
    </AdminGate>,
  );
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.queryByText("Relatório")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Agora não" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.queryByText(adminDeniedMessage)).not.toBeInTheDocument();
  expect(screen.queryByText("Relatório")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Entrar" }));
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});

it("renders admin content for an administrator", () => {
  render(
    <AdminGate role="admin" returnPath="admin">
      <p>Relatório</p>
    </AdminGate>,
  );
  expect(screen.getByText("Relatório")).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("tells another signed-in account and leaves for the blog", () => {
  const go = vi.fn();
  render(
    <AdminGate role="member" returnPath="admin" go={go}>
      <p>Relatório</p>
    </AdminGate>,
  );
  expect(screen.getByText(adminDeniedMessage)).toBeInTheDocument();
  expect(screen.queryByText("Relatório")).not.toBeInTheDocument();
  expect(go).toHaveBeenCalledWith(adminBlogHome);
});
```

- [ ] **Step 2: Run the gate test and confirm it fails**

Run: `npx vitest run src/admin/AdminGate.test.tsx --exclude .worktrees/**`

Expected: FAIL because `./AdminGate` does not exist.

- [ ] **Step 3: Implement the gate**

Create `src/admin/gate.ts`:

```ts
export const adminBlogHome = "https://tiagocosmai.github.io/pt/blog";
export const adminDeniedMessage = "Esta conta não administra o blog.";
```

Create `src/admin/AdminGate.tsx`:

```tsx
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { LoginPrompt } from "../components/LoginPrompt";
import { LocaleProvider } from "../context/LocaleContext";
import { adminBlogHome, adminDeniedMessage } from "./gate";

export function AdminGate({
  role,
  returnPath,
  go = (url: string) => window.location.assign(url),
  children,
}: {
  role: "admin" | "member" | null;
  returnPath: string;
  go?: (url: string) => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(role === null);
  const [denied, setDenied] = useState(role === "member");

  useEffect(() => {
    if (denied) go(adminBlogHome);
  }, [denied, go]);

  if (denied) return <p>{adminDeniedMessage}</p>;
  if (role !== "admin") {
    return (
      <LocaleProvider>
        {open ? (
          <LoginPrompt
            open
            slug={returnPath}
            onClose={() => setOpen(false)}
            onSignedIn={() => window.location.reload()}
            onGuest={() => setDenied(true)}
          />
        ) : (
          <button type="button" onClick={() => setOpen(true)}>
            Entrar
          </button>
        )}
      </LocaleProvider>
    );
  }
  return children;
}
```

- [ ] **Step 4: Run the gate test and confirm it passes**

Run: `npx vitest run src/admin/AdminGate.test.tsx --exclude .worktrees/**`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/admin/gate.ts src/admin/AdminGate.tsx src/admin/AdminGate.test.tsx
GIT_AUTHOR_NAME='Tiago Cosmai' GIT_AUTHOR_EMAIL='tiagocosmai@gmail.com' GIT_COMMITTER_NAME='Tiago Cosmai' GIT_COMMITTER_EMAIL='tiagocosmai@gmail.com' git commit -m "$(cat <<'EOF'
Open the login modal on admin routes and turn other accounts back to the blog.

EOF
)"
```

---

### Task 5: Show the report

**Files:**
- Create: `src/admin/AdminFrame.tsx`
- Create: `src/admin/AdminReport.tsx`
- Create: `src/admin/AdminReport.test.tsx`
- Create: `src/admin/AdminHome.tsx`
- Modify: `app/admin/page.tsx`
- Test: `src/admin/AdminReport.test.tsx`

**Interfaces:**
- Consumes: `AdminGate`, `AdminReportArticle` JSON from `GET /api/admin/report`
- Produces: `AdminFrame({ view: "report" | "comments" })` with links `/admin` and `/admin/comentarios`. `AdminReport` renders the table. `AdminHome({ role, view, status, article })` composes the gate, frame, and view. `app/admin/page.tsx` passes the session role and `view="report"`.

- [ ] **Step 1: Write the failing report screen test**

Create `src/admin/AdminReport.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { AdminFrame } from "./AdminFrame";
import { AdminReport } from "./AdminReport";

const article = {
  slug: "antigo",
  title: "Antigo",
  publishedOn: "2026-09-01",
  comments: { pending: 1, approved: 1, rejected: 1 },
  reactions: { like: 2, celebrate: 0, support: 0, love: 0, insightful: 0, funny: 0 },
};

function json(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(() => json({ articles: [article] })));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

it("shows one row of comment and reaction counts", async () => {
  render(
    <AdminFrame view="report">
      <AdminReport />
    </AdminFrame>,
  );
  expect(screen.getByRole("link", { name: "Relatório" })).toHaveAttribute("href", "/admin");
  expect(screen.getByRole("link", { name: "Comentários" })).toHaveAttribute("href", "/admin/comentarios");
  const row = await screen.findByRole("row", { name: /Antigo/ });
  expect(row).toHaveTextContent("Antigo 1 1 1 2 0 0 0 0 0");
  for (const header of ["Artigo", "Pendentes", "Aprovados", "Recusados", "Gostei", "Parabéns", "Apoio", "Amei", "Genial", "Divertido"]) {
    expect(screen.getByRole("columnheader", { name: header })).toBeInTheDocument();
  }
});

it("shows the load error without a table", async () => {
  vi.stubGlobal("fetch", vi.fn(() => json({}, 500)));
  render(<AdminReport />);
  expect(await screen.findByText("Não foi possível carregar.")).toBeInTheDocument();
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
});

it("shows the empty sentence when there are no articles", async () => {
  vi.stubGlobal("fetch", vi.fn(() => json({ articles: [] })));
  render(<AdminReport />);
  expect(await screen.findByText("Não há itens para o filtro atual.")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the report screen test and confirm it fails**

Run: `npx vitest run src/admin/AdminReport.test.tsx --exclude .worktrees/**`

Expected: FAIL because `./AdminReport` does not exist.

- [ ] **Step 3: Implement the frame, report, and page**

Create `src/admin/AdminFrame.tsx`:

```tsx
import type { ReactNode } from "react";

export function AdminFrame({ view, children }: { view: "report" | "comments"; children: ReactNode }) {
  return (
    <main>
      <nav aria-label="Administração">
        <a href="/admin" aria-current={view === "report" ? "page" : undefined}>
          Relatório
        </a>
        <a href="/admin/comentarios" aria-current={view === "comments" ? "page" : undefined}>
          Comentários
        </a>
      </nav>
      {children}
    </main>
  );
}
```

Create `src/admin/AdminReport.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import type { AdminReportArticle } from "../api/adminReport";

const reactionKeys = ["like", "celebrate", "support", "love", "insightful", "funny"] as const;
const headers = ["Artigo", "Pendentes", "Aprovados", "Recusados", "Gostei", "Parabéns", "Apoio", "Amei", "Genial", "Divertido"];

export function AdminReport() {
  const [articles, setArticles] = useState<AdminReportArticle[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let stopped = false;
    void (async () => {
      try {
        const response = await fetch("/api/admin/report");
        if (!response.ok) throw new Error("load");
        const body = (await response.json()) as { articles: AdminReportArticle[] };
        if (!stopped) setArticles(body.articles);
      } catch {
        if (!stopped) setError(true);
      }
    })();
    return () => {
      stopped = true;
    };
  }, []);

  if (error) return <p>Não foi possível carregar.</p>;
  if (!articles) return null;
  if (articles.length === 0) return <p>Não há itens para o filtro atual.</p>;
  return (
    <table>
      <thead>
        <tr>
          {headers.map((header) => (
            <th key={header}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {articles.map((article) => (
          <tr key={article.slug}>
            <td>{article.title}</td>
            <td>{article.comments.pending}</td>
            <td>{article.comments.approved}</td>
            <td>{article.comments.rejected}</td>
            {reactionKeys.map((key) => (
              <td key={key}>{article.reactions[key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

Create `src/admin/AdminHome.tsx`:

```tsx
"use client";

import { AdminComments } from "./AdminComments";
import { AdminFrame } from "./AdminFrame";
import { AdminGate } from "./AdminGate";
import { AdminReport } from "./AdminReport";

export function AdminHome({
  role,
  view,
  status = null,
  article = null,
}: {
  role: "admin" | "member" | null;
  view: "report" | "comments";
  status?: string | null;
  article?: string | null;
}) {
  return (
    <AdminGate role={role} returnPath={view === "report" ? "admin" : "admin/comentarios"}>
      <AdminFrame view={view}>
        {view === "report" ? <AdminReport /> : <AdminComments status={status} article={article} />}
      </AdminFrame>
    </AdminGate>
  );
}
```

`AdminComments` is created in Task 6. Until that file exists, this task's `AdminHome` only needs the report branch, but the signature above includes `status` and `article` so Task 6 does not change the page contract. To keep this task compiling, create `src/admin/AdminComments.tsx` exporting `export function AdminComments(_: { status: string | null; article: string | null }) { return null; }` and replace it in Task 6.

Replace `app/admin/page.tsx`:

```tsx
import { auth } from "../../src/auth";
import { AdminHome } from "../../src/admin/AdminHome";

export const runtime = "nodejs";

export default async function AdminPage() {
  const session = await auth();
  const role = session?.userId && (session.role === "admin" || session.role === "member") ? session.role : null;
  return <AdminHome role={role} view="report" />;
}
```

- [ ] **Step 4: Run the report screen test and confirm it passes**

Run: `npx vitest run src/admin/AdminReport.test.tsx src/admin/AdminGate.test.tsx --exclude .worktrees/**`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/admin/AdminFrame.tsx src/admin/AdminReport.tsx src/admin/AdminReport.test.tsx src/admin/AdminHome.tsx src/admin/AdminComments.tsx app/admin/page.tsx
GIT_AUTHOR_NAME='Tiago Cosmai' GIT_AUTHOR_EMAIL='tiagocosmai@gmail.com' GIT_COMMITTER_NAME='Tiago Cosmai' GIT_COMMITTER_EMAIL='tiagocosmai@gmail.com' git commit -m "$(cat <<'EOF'
Show the article report on the admin home.

EOF
)"
```

---

### Task 6: Moderate from the comments tab

**Files:**
- Create: `src/admin/AdminComments.tsx` (replace the stub)
- Create: `src/admin/AdminComments.test.tsx`
- Create: `app/admin/comentarios/page.tsx`
- Modify: `src/admin/AdminHome.tsx` only if the comments branch is still absent
- Test: `src/admin/AdminComments.test.tsx`

**Interfaces:**
- Consumes: `GET /api/admin/comments`, `GET /api/admin/report`, `POST /api/admin/comments/:id/status`, `DELETE /api/admin/comments/:id`, `AdminFrame`
- Produces: `AdminComments({ status, article })` and the page at `/admin/comentarios`

- [ ] **Step 1: Write the failing comments screen test**

Create `src/admin/AdminComments.test.tsx`. Stub `fetch` so `/api/admin/report` returns one article `{ slug: "o-agente-secreto", title: "PT", publishedOn: "2026-09-24", comments: { pending: 1, approved: 0, rejected: 0 }, reactions: { like: 0, celebrate: 0, support: 0, love: 0, insightful: 0, funny: 0 } }` and `/api/admin/comments` returns one pending comment with `parentId: null` plus one reply with `parentId` set. Render `<AdminFrame view="comments"><AdminComments status={null} article={null} /></AdminFrame>`.

Assert the reply row contains `Resposta`. Assert a link named `Pendente` has `href` `/admin/comentarios?status=pending`. Assert a link named `PT` has `href` `/admin/comentarios?article=o-agente-secreto`. Assert a link named `Todos` has `href` `/admin/comentarios`.

Click `Aprovado` on the pending row. The stubbed `POST` returns the same comment with `status: "approved"`. Because the screen was rendered with `status="pending"`, the row disappears. Render a second example with `status={null}`, click `Aprovado`, and assert the row remains and shows `approved`.

Stub `window.confirm` to return `false` and click `Excluir`. Assert `fetch` was not called with `DELETE`. Stub confirm to return `true`, click `Excluir`, and assert the row is gone after a 200 `DELETE`.

Stub the comments `GET` as a 500 and assert `Não foi possível carregar.` Stub a failed `POST` and assert `Não foi possível salvar.` and that the original status text remains.

- [ ] **Step 2: Run the comments screen test and confirm it fails**

Run: `npx vitest run src/admin/AdminComments.test.tsx --exclude .worktrees/**`

Expected: FAIL because the stub returns null and the links are absent.

- [ ] **Step 3: Implement the comments screen and page**

Replace `src/admin/AdminComments.tsx` with a client component. Types and helpers:

```tsx
"use client";

import { useEffect, useState } from "react";
import type { AdminReportArticle } from "../api/adminReport";

type CommentStatus = "pending" | "approved" | "rejected";

type CommentRow = {
  id: string;
  articleSlug: string;
  articleTitle: string;
  authorName: string;
  createdAt: string;
  status: CommentStatus;
  body: string;
  parentId: string | null;
  error?: boolean;
};

const statusLinks: { label: string; status: CommentStatus | null }[] = [
  { label: "Todos", status: null },
  { label: "Pendente", status: "pending" },
  { label: "Aprovado", status: "approved" },
  { label: "Recusado", status: "rejected" },
];

function href(status: string | null, article: string | null) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (article) params.set("article", article);
  const query = params.toString();
  return query ? `/admin/comentarios?${query}` : "/admin/comentarios";
}

export function AdminComments({ status, article }: { status: string | null; article: string | null }) {
  const [rows, setRows] = useState<CommentRow[] | null>(null);
  const [articles, setArticles] = useState<AdminReportArticle[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let stopped = false;
    void (async () => {
      try {
        const listUrl = href(status, article).replace("/admin/comentarios", "/api/admin/comments");
        const [reportResponse, listResponse] = await Promise.all([
          fetch("/api/admin/report"),
          fetch(listUrl),
        ]);
        if (!reportResponse.ok || !listResponse.ok) throw new Error("load");
        const report = (await reportResponse.json()) as { articles: AdminReportArticle[] };
        const list = (await listResponse.json()) as { comments: CommentRow[] };
        if (stopped) return;
        setArticles(report.articles);
        setRows(list.comments);
      } catch {
        if (!stopped) setError(true);
      }
    })();
    return () => {
      stopped = true;
    };
  }, [status, article]);

  async function change(row: CommentRow, next: CommentStatus) {
    const response = await fetch(`/api/admin/comments/${row.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!response.ok) {
      setRows((current) => current?.map((item) => (item.id === row.id ? { ...item, error: true } : item)) ?? null);
      return;
    }
    const body = (await response.json()) as { comment: CommentRow };
    setRows((current) => {
      if (!current) return current;
      if (status && status !== body.comment.status) return current.filter((item) => item.id !== row.id);
      return current.map((item) => (item.id === row.id ? { ...body.comment, error: false } : item));
    });
  }

  async function remove(row: CommentRow) {
    if (!window.confirm("Excluir este comentário?")) return;
    const response = await fetch(`/api/admin/comments/${row.id}`, { method: "DELETE" });
    if (!response.ok) {
      setRows((current) => current?.map((item) => (item.id === row.id ? { ...item, error: true } : item)) ?? null);
      return;
    }
    setRows((current) => current?.filter((item) => item.id !== row.id) ?? null);
  }

  if (error) return <p>Não foi possível carregar.</p>;
  if (!rows) return null;
  return (
    <section>
      <nav aria-label="Status">
        {statusLinks.map((link) => (
          <a key={link.label} href={href(link.status, article)}>
            {link.label}
          </a>
        ))}
      </nav>
      <nav aria-label="Artigos">
        <a href={href(status, null)}>Todos</a>
        {articles.map((item) => (
          <a key={item.slug} href={href(status, item.slug)}>
            {item.title}
          </a>
        ))}
      </nav>
      {rows.length === 0 ? <p>Não há itens para o filtro atual.</p> : null}
      <table>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.articleTitle}</td>
              <td>{row.authorName}</td>
              <td>{new Date(row.createdAt).toLocaleDateString("pt-BR")}</td>
              <td>{row.status}</td>
              <td>{row.body}</td>
              <td>{row.parentId ? "Resposta" : ""}</td>
              <td>
                {statusLinks.slice(1).map((link) => (
                  <button
                    key={link.status}
                    type="button"
                    disabled={row.status === link.status}
                    onClick={() => void change(row, link.status as CommentStatus)}
                  >
                    {link.label}
                  </button>
                ))}
                <button type="button" onClick={() => void remove(row)}>
                  Excluir
                </button>
                {row.error ? <p>Não foi possível salvar.</p> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
```

`href` builds both the page links and, with the `/admin/comentarios` prefix replaced, the list request. A screen rendered with `status="pending"` drops a row whose new status is different. A screen rendered with `status={null}` keeps the row and shows the returned status. `window.confirm` returning false does not call `DELETE`.

Create `app/admin/comentarios/page.tsx`:

```tsx
import { auth } from "../../../src/auth";
import { AdminHome } from "../../../src/admin/AdminHome";

export const runtime = "nodejs";

export default async function AdminCommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; article?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const role = session?.userId && (session.role === "admin" || session.role === "member") ? session.role : null;
  return <AdminHome role={role} view="comments" status={params.status ?? null} article={params.article ?? null} />;
}
```

Wire `AdminHome` to render `AdminComments` for `view="comments"`.

- [ ] **Step 4: Run the comments screen test and the admin suite**

Run: `npx vitest run src/admin src/api/adminComments.test.ts src/api/adminReport.test.ts src/db/users.test.ts --exclude .worktrees/**`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/admin/AdminComments.tsx src/admin/AdminComments.test.tsx src/admin/AdminHome.tsx app/admin/comentarios/page.tsx
GIT_AUTHOR_NAME='Tiago Cosmai' GIT_AUTHOR_EMAIL='tiagocosmai@gmail.com' GIT_COMMITTER_NAME='Tiago Cosmai' GIT_COMMITTER_EMAIL='tiagocosmai@gmail.com' git commit -m "$(cat <<'EOF'
Filter, retarget, and delete comments from the admin list.

EOF
)"
```
