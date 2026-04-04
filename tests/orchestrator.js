import retry from "async-retry";
import database from "infra/database.js";
import migrator from "models/migrator.js";

const STATUS_API_URL = "http://localhost:3000/api/v1/status";
const CLEAR_DATABASE_QUERY =
  "DROP SCHEMA public CASCADE; CREATE SCHEMA public;";
const STATUS_FETCH_TIMEOUT_MS = 5_000;

// Parametros de retry para aguardar a subida do servidor web em ambiente de testes.
const WEB_SERVER_RETRY_OPTIONS = {
  retries: 100,
  factor: 1,
  randomize: false,
  maxTimeout: 1_000,
  minimumTimeout: 100,
  onRetry: (error, attempt) => {
    process.stdout.write(
      `Attempt ${attempt} - Failed to fetch status page: ${error.message}\n`,
    );
  },
};

// Aguarda todos os servicos essenciais para os testes de integracao.
async function waitForAllServices() {
  await waitForWebServer();
}

// Aguarda o endpoint de status responder com HTTP 2xx.
async function waitForWebServer() {
  await retry(fetchStatusPage, WEB_SERVER_RETRY_OPTIONS);
}

// Consulta a API de status para confirmar que a aplicacao esta pronta.
async function fetchStatusPage() {
  const response = await fetch(STATUS_API_URL, {
    // Evita travamento indefinido caso o servidor aceite conexao, mas nao responda.
    signal: AbortSignal.timeout(STATUS_FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}`);
  }

  await response.json();
}

// Limpa o schema publico para garantir isolamento entre cenarios de teste.
async function clearDatabase() {
  await database.query({
    text: CLEAR_DATABASE_QUERY,
  });
}

async function runPendingMigrations() {
  return await migrator.runPendingMigrations();
}

export default {
  waitForAllServices,
  clearDatabase,
  runPendingMigrations,
};
