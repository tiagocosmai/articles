// @vitest-environment node
import fs from "fs";
import path from "path";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { articleLinkedinPosts, articleLocales, articles } from "../db/schema";
import { createTestDb } from "../db/testDb";
import { importEditorialMarkdown } from "./adminPostImport";

const fixture = fs.readFileSync(
  path.join(process.cwd(), "test/fixtures/editorial/01-do-codigo-ao-contexto.md"),
  "utf8",
);

const admin = { id: "admin-id", role: "admin" as const, name: "Admin" };

describe("importEditorialMarkdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-08T12:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates a scheduled post seven days ahead", async () => {
    const db = await createTestDb();
    const result = await importEditorialMarkdown(db, admin, { markdown: fixture, action: "create" });
    expect(result.status).toBe(200);
    if (result.status !== 200) return;
    expect(result.body).toMatchObject({ status: "created", post: { slug: "do-codigo-ao-contexto", state: "scheduled" } });

    const [row] = await db.select().from(articles).where(eq(articles.slug, "do-codigo-ao-contexto"));
    expect(row?.publishedOn).toBe("2026-10-15");

    const locales = await db.select().from(articleLocales).where(eq(articleLocales.articleId, row!.id));
    expect(locales).toHaveLength(3);
    expect(locales.every((item) => item.objective.trim().length > 0)).toBe(true);

    const linkedIn = await db
      .select()
      .from(articleLinkedinPosts)
      .where(eq(articleLinkedinPosts.articleId, row!.id));
    expect(linkedIn).toHaveLength(3);
    expect(linkedIn.find((item) => item.locale === "pt")?.body).toContain("/pt/blog/do-codigo-ao-contexto");
  });

  it("updates an existing post and keeps the publication date", async () => {
    const db = await createTestDb();
    const first = await importEditorialMarkdown(db, admin, { markdown: fixture, action: "create" });
    expect(first.status).toBe(200);
    const [row] = await db.select().from(articles).where(eq(articles.slug, "do-codigo-ao-contexto"));
    await db.update(articles).set({ publishedOn: "2026-09-01" }).where(eq(articles.id, row!.id));

    const updated = await importEditorialMarkdown(db, admin, { markdown: fixture, action: "update" });
    expect(updated.status).toBe(200);
    const [after] = await db.select().from(articles).where(eq(articles.slug, "do-codigo-ao-contexto"));
    expect(after?.publishedOn).toBe("2026-09-01");
  });

  it("returns validation errors without writing", async () => {
    const db = await createTestDb();
    const result = await importEditorialMarkdown(db, admin, { markdown: "<!-- no slug -->\n# Português" });
    expect(result.status).toBe(200);
    if (result.status !== 200) return;
    expect(result.body).toMatchObject({ status: "invalid" });
    expect(await db.select().from(articles)).toHaveLength(0);
  });
});
