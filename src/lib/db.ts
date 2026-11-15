import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

type Value = string | number | null | boolean;
type Statement = { sql: string; values?: readonly Value[] };
type D1Result<Row> = { results: Row[]; meta: { changes: number } };
type PreparedStatement = {
  bind(...values: (string | number | null)[]): PreparedStatement;
  all<Row>(): Promise<D1Result<Row>>;
};
type D1Binding = {
  prepare(sql: string): PreparedStatement;
  batch<Row>(statements: PreparedStatement[]): Promise<D1Result<Row>[]>;
};

declare global {
  interface CloudflareEnv {
    DB: D1Binding;
  }
}

async function database(): Promise<D1Binding> {
  const { env } = await getCloudflareContext({ async: true });
  const { DB } = env;
  if (!DB) throw new Error("Cloudflare D1 binding DB is not configured.");
  return DB;
}

function prepare(db: D1Binding, statement: Statement): PreparedStatement {
  const sql = statement.sql.replace(/\$(\d+)/g, "?$1");
  const values = (statement.values ?? []).map((value) =>
    typeof value === "boolean" ? Number(value) : value,
  );
  return db.prepare(sql).bind(...values);
}

export async function query<Row = Record<string, unknown>>(
  sql: string,
  values: readonly Value[] = [],
): Promise<{ rows: Row[]; rowCount: number }> {
  const result = await prepare(await database(), { sql, values }).all<Row>();
  return { rows: result.results, rowCount: result.meta.changes || result.results.length };
}

export async function batch<Row = Record<string, unknown>>(
  statements: readonly Statement[],
): Promise<Array<{ rows: Row[]; rowCount: number }>> {
  if (statements.length === 0) return [];
  const db = await database();
  const results = await db.batch<Row>(statements.map((statement) => prepare(db, statement)));
  return results.map((result) => ({
    rows: result.results,
    rowCount: result.meta.changes || result.results.length,
  }));
}
