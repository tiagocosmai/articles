import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "./schema";

export async function createTestDb() {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return db;
}

export type TestDatabase = Awaited<ReturnType<typeof createTestDb>>;
export type TestDbTransaction = Parameters<Parameters<TestDatabase["transaction"]>[0]>[0];
/** Database handle or an open transaction — same query API. */
export type DbExecutor = TestDatabase | TestDbTransaction;
