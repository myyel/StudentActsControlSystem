import { drizzle } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { Pool } from "pg";
import * as schema from "./schema";

/** Driver-agnostic handle: satisfied by node-postgres in the app and PGlite in tests. */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
/** Services accept either, so callers can compose them inside one transaction. */
export type DbOrTx = Db | Tx;

export function createDb(connectionString: string) {
  const pool = new Pool({ connectionString });
  return { db: drizzle({ client: pool, schema, casing: "snake_case" }), pool };
}

const globalForDb = globalThis as unknown as { __db?: ReturnType<typeof createDb> };

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  // Reuse the pool across hot reloads in development.
  globalForDb.__db ??= createDb(url);
  return globalForDb.__db.db;
}

export const db: Db = getDb();
