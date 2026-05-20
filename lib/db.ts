import { Pool, type QueryResult, type QueryResultRow } from "pg";

let pool: Pool | null = null;

export function hasDatabaseConfig() {
  return Boolean(process.env.DATABASE_URL);
}

export function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.DATABASE_SSL === "false"
          ? false
          : process.env.DATABASE_URL.includes("localhost") ||
              process.env.DATABASE_URL.includes("127.0.0.1")
            ? false
            : { rejectUnauthorized: false },
    });
  }

  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params);
}
