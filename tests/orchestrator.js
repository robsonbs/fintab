import { faker } from "@faker-js/faker/locale/pt_BR";
import retry from "async-retry";
import database from "infra/database.js";
import migrator from "models/migrator.js";
import user from "models/user.js";
import session from "models/session.js";
import activation from "models/activation";

const STATUS_API_URL = "http://localhost:3000/api/v1/status";
const emailHttpUrl = `http://${process.env.EMAIL_HTTP_HOST}:${process.env.EMAIL_HTTP_PORT}`;

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
  await Promise.allSettled([waitForWebServer(), waitForEmailServer()]);
}

// Aguarda o endpoint de status responder com HTTP 2xx.
async function waitForWebServer() {
  await retry(fetchStatusPage, WEB_SERVER_RETRY_OPTIONS);
}

// Aguarda o servidor de email aceitar conexoes e responder a requisicoes HTTP.
async function waitForEmailServer() {
  return retry(fetchEmailPage, {
    retries: 100,
    maxTimeout: 1_000,
    onRetry: (error, attempt) => {
      process.stdout.write(
        `Attempt ${attempt} - Failed to fetch email page: ${error.message}\n`,
      );
    },
  });

  async function fetchEmailPage() {
    const response = await fetch(emailHttpUrl);
    if (!response.ok) {
      throw Error(`HTTP error ${response.status}`);
    }
  }
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

async function createUser(userObject) {
  return await user.create({
    username:
      userObject?.username || faker.internet.username().replace(/[_.-]/g, ""),
    email: userObject?.email || faker.internet.email(),
    password: userObject?.password || "validpassword",
  });
}

async function activateUser(inactivatedUser) {
  return await activation.activateUserByUserId(inactivatedUser.id);
}

async function createSessionForUser(userId) {
  return await session.create(userId);
}

// limpa todos os emails recebidos pelo servidor de email, garantindo isolamento entre cenarios de teste.
async function deleteAllEmails() {
  await fetch(`${emailHttpUrl}/messages`, {
    method: "DELETE",
  });
}

// Consulta a API HTTP do servidor de email para obter o ultimo email recebido.
async function getLastEmail() {
  const emailListResponse = await fetch(`${emailHttpUrl}/messages`);
  const emailListBody = await emailListResponse.json();
  const lastEmailItem = emailListBody.pop();

  if (!lastEmailItem) {
    return null;
  }

  const emailTextResponse = await fetch(
    `${emailHttpUrl}/messages/${lastEmailItem.id}.plain`,
  );
  const emailTextBody = await emailTextResponse.text();

  lastEmailItem.text = emailTextBody;
  return lastEmailItem;
}

async function extractUUIDFromEmailText(emailText) {
  const uuidRegex = /[0-9a-fA-F-]{36}/i;
  const match = emailText.match(uuidRegex);
  return match ? match[0] : null;
}

async function addFeaturesToUser(userObject, features) {
  const updatedUser = await user.addFeatures(userObject.id, features);
  return updatedUser;
}

export default {
  waitForAllServices,
  clearDatabase,
  runPendingMigrations,
  createUser,
  activateUser,
  createSessionForUser,
  deleteAllEmails,
  getLastEmail,
  extractUUIDFromEmailText,
  addFeaturesToUser,
};
