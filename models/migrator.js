import database from "infra/database.js";
import { runner as migrationRunner } from "node-pg-migrate";
import { resolve } from "node:path";

const MIGRATIONS_DIR = resolve(process.cwd(), "infra", "migrations");
const MIGRATIONS_TABLE = "pgmigrations";

// Monta as opcoes padrao para execucao das migrations com o cliente de banco.
function buildMigrationsOptions({ dbClient, dryRun }) {
  return {
    databaseUrl: process.env.DATABASE_URL,
    dir: MIGRATIONS_DIR,
    dryRun,
    direction: "up",
    migrationsTable: MIGRATIONS_TABLE,
    log: () => {}, // Sobrescreve o logger padrao para evitar poluicao de logs em ambiente de testes.
    dbClient,
  };
}

// Executa um conjunto de migrations, em modo dry-run ou aplicando de fato.
async function runMigrations({ dryRun }) {
  let dbClient;

  try {
    dbClient = await database.getClient();
    return await migrationRunner(buildMigrationsOptions({ dbClient, dryRun }));
  } finally {
    await closeDatabaseClient(dbClient);
  }
}

// Garante que o cliente do banco seja finalizado sem mascarar erros principais.
async function closeDatabaseClient(dbClient) {
  if (!dbClient) {
    return;
  }

  try {
    await dbClient.end();
  } catch (closeError) {
    console.error("Error closing database client:", closeError);
  }
}

export default {
  // Lista apenas as migrations pendentes sem aplicar alteracoes no banco.
  listPendingMigrations: async () => await runMigrations({ dryRun: true }),
  // Aplica as migrations pendentes e devolve o resultado da execucao.
  runPendingMigrations: async () => await runMigrations({ dryRun: false }),
};
