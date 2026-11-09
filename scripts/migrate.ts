import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Pool } from "pg";

async function main() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to run database migrations.");
  }

  const pool = new Pool({ connectionString, max: 1 });
  const client = await pool.connect();

  try {
    await client.query("SELECT pg_advisory_lock($1)", [721948221]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_schema_migrations (
        version text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const migrationsDirectory = join(process.cwd(), "migrations");
    const migrationFiles = (await readdir(migrationsDirectory))
      .filter((name) => /^\d+_.+\.sql$/.test(name) && !name.endsWith(".down.sql"))
      .sort();

    for (const filename of migrationFiles) {
      const alreadyApplied = await client.query(
        "SELECT 1 FROM app_schema_migrations WHERE version = $1",
        [filename],
      );
      if (alreadyApplied.rowCount) continue;

      const sql = await readFile(join(migrationsDirectory, filename), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO app_schema_migrations (version) VALUES ($1)",
          [filename],
        );
        await client.query("COMMIT");
        console.info(`Applied database migration ${filename}.`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [721948221]);
    client.release();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error("Database migration failed.", error);
  process.exitCode = 1;
});
