import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";
import type { TestDatabase } from "./testDb";

export function getDb(): TestDatabase {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  const pool = new Pool({ connectionString: url });
  return drizzle(pool, { schema }) as unknown as TestDatabase;
}
