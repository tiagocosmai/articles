import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  check,
  date,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["member", "admin"]);
export const locale = pgEnum("locale", ["pt", "en", "es"]);
export const identityProvider = pgEnum("identity_provider", [
  "github",
  "linkedin",
  "gmail",
  "magiclink",
  "microsoft",
  "guest",
]);
export const commentStatus = pgEnum("comment_status", ["pending", "approved", "rejected"]);
export const reactionType = pgEnum("reaction_type", [
  "like",
  "celebrate",
  "support",
  "love",
  "insightful",
  "funny",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email"),
  role: userRole("role").notNull().default("member"),
  ...timestamps,
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })],
);

export const identities = pgTable(
  "identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    provider: identityProvider("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    providerUsername: text("provider_username"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    unique("identities_provider_account_unique").on(table.provider, table.providerAccountId),
    unique("identities_user_provider_unique").on(table.userId, table.provider),
  ],
);

export const articles = pgTable("articles", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  publishedOn: date("published_on").notNull(),
  ...timestamps,
});

export const articleSlugRedirects = pgTable("article_slug_redirects", {
  slug: text("slug").primaryKey(),
  articleId: uuid("article_id")
    .notNull()
    .references(() => articles.id),
});

export const articleLocales = pgTable(
  "article_locales",
  {
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id),
    locale: locale("locale").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    body: text("body").notNull(),
  },
  (table) => [primaryKey({ columns: [table.articleId, table.locale] })],
);

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
});

export const tagLocales = pgTable(
  "tag_locales",
  {
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id),
    locale: locale("locale").notNull(),
    label: text("label").notNull(),
  },
  (table) => [primaryKey({ columns: [table.tagId, table.locale] })],
);

export const articleTags = pgTable(
  "article_tags",
  {
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id),
    position: integer("position").notNull(),
  },
  (table) => [primaryKey({ columns: [table.articleId, table.tagId] })],
);

export const flashcards = pgTable(
  "flashcards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id),
    locale: locale("locale").notNull(),
    code: text("code").notNull(),
    front: text("front").notNull(),
    back: text("back").notNull(),
    position: integer("position").notNull(),
  },
  (table) => [unique("flashcards_article_locale_code_unique").on(table.articleId, table.locale, table.code)],
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    parentId: uuid("parent_id").references((): AnyPgColumn => comments.id),
    body: text("body").notNull(),
    status: commentStatus("status").notNull().default("pending"),
    ...timestamps,
  },
  (table) => [
    check("comments_body_length", sql`char_length(${table.body}) between 1 and 1000`),
  ],
);

export const reactions = pgTable(
  "reactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    type: reactionType("type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    uniqueIndex("reactions_active_unique")
      .on(table.userId, table.articleId, table.type)
      .where(sql`${table.deletedAt} is null`),
  ],
);
