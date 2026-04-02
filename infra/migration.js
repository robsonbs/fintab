import database from "infra/database";
import migrationRunner from "node-pg-migrate";
import { join } from "node:path";

const MIGRATIONS_DIR = join("infra", "migrations");
const MIGRATIONS_TABLE = "pgmigrations";

function buildMigrationsOptions({ dbClient, dryRun }) {
  return {
    databaseUrl: process.env.DATABASE_URL,
    dir: MIGRATIONS_DIR,
    dryRun,
    direction: "up",
    verbose: true,
    migrationsTable: MIGRATIONS_TABLE,
    dbClient,
  };
}

export async function runMigrations({ dryRun }) {
  let dbClient;

  try {
    dbClient = await database.getClient();
    return await migrationRunner(buildMigrationsOptions({ dbClient, dryRun }));
  } finally {
    if (dbClient) {
      try {
        await dbClient.end();
      } catch (closeError) {
        console.error("Error closing database client:", closeError);
      }
    }
  }
}
