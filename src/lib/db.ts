import "server-only";

import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

let pool: Pool | undefined;

export function getPool(): Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
  });

  pool.on("error", () => {
    console.error(JSON.stringify({ event: "database_pool_error" }));
  });

  return pool;
}

export async function query<Row extends QueryResultRow = QueryResultRow>(
  text: string,
  values: readonly unknown[] = [],
): Promise<QueryResult<Row>> {
  // React's development error transport cannot reliably deserialize AggregateError.
  return new Promise((resolve, reject) => {
    getPool().query<Row>(text, [...values], (error, result) => {
      if (error instanceof AggregateError) {
        console.warn(JSON.stringify({ event: "database_query_aggregate_error" }));
        reject(new Error("Database query failed.", { cause: error.errors }));
      } else if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
}

export async function withTransaction<T>(
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
