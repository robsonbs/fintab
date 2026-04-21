import activation from "models/activation";
import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  // Aguarda os servicos antes de iniciar os cenarios de integracao.
  await orchestrator.waitForAllServices();
});

beforeEach(async () => {
  // Reseta o estado do banco antes de cada teste para garantir isolamento.
  await orchestrator.runPendingMigrations();
});

const STATUS_API_URL = "http://localhost:3000/api/v1/status";

// Busca o endpoint de status e retorna resposta + corpo JSON.
async function fetchStatus(sessionToken) {
  if (!sessionToken) {
    const response = await fetch(STATUS_API_URL);
    const responseBody = await response.json();

    return { response, responseBody };
  }
  const response = await fetch(STATUS_API_URL, {
    headers: {
      cookie: `session_id=${sessionToken}`,
    },
  });
  const responseBody = await response.json();
  return { response, responseBody };
}

function expectOkJsonResponse(response) {
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("application/json");
}

// Valida o formato minimo esperado para o payload de status.
function expectStatusPayload(responseBody) {
  expect(responseBody).toEqual(
    expect.objectContaining({
      updated_at: expect.any(String),
      dependencies: expect.objectContaining({
        database: expect.any(Object),
      }),
    }),
  );
}

// Extrai major.minor de versoes como "16.0", "16.1", "16.3 (Debian ...)".
function parsePostgresVersion(version) {
  const match = version.match(/^(\d+)(?:\.(\d+))?/);

  if (!match) {
    throw new Error(`Formato de versao invalido: ${version}`);
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2] ?? 0),
  };
}

// Valida o formato ISO-8601 retornado no campo updated_at.
function expectValidIsoDate(dateString) {
  expect(dateString).toBeDefined();
  expect(dateString).toEqual(new Date(dateString).toISOString());
}

// Valida os campos principais de status do banco.
function expectValidDatabaseStatusAll(database) {
  expect(database).toEqual(
    expect.objectContaining({
      environment: expect.any(String),
      version: expect.any(String),
      max_connections: expect.any(Number),
      open_connections: expect.any(Number),
    }),
  );

  const { major, minor } = parsePostgresVersion(database.version);
  expect(major).toBe(16);
  expect(minor).toBeGreaterThanOrEqual(0);
  expect(database.max_connections).toBeGreaterThan(0);
  expect(database.open_connections).toBeGreaterThanOrEqual(1);
}

function expectValidDatabaseStatus(database) {
  expect(database).toEqual(
    expect.objectContaining({
      max_connections: expect.any(Number),
      open_connections: expect.any(Number),
    }),
  );

  expect(database.max_connections).toBeGreaterThan(0);
  expect(database.open_connections).toBeGreaterThanOrEqual(1);
  expect(database).not.toHaveProperty("version");
  expect(database).not.toHaveProperty("environment");
}
describe("GET /api/v1/status", () => {
  describe("Anonymous user", () => {
    test("returns status with content-type JSON", async () => {
      expect.hasAssertions();

      const { response } = await fetchStatus();

      expectOkJsonResponse(response);
    });

    test("returns valid database status fields", async () => {
      expect.hasAssertions();

      const { response, responseBody } = await fetchStatus();
      const { dependencies, updated_at: updatedAt } = responseBody;
      const { database } = dependencies;

      expectOkJsonResponse(response);
      expectStatusPayload(responseBody);
      expectValidIsoDate(updatedAt);
      expectValidDatabaseStatus(database);
    });
  });

  describe("Default user", () => {
    const createDefaultUserAndSession = async () => {
      const defaultUser = await orchestrator.createUser();

      const activatedDefaultUser = await activation.activateUserByUserId(
        defaultUser.id,
      );

      const defaultSessionObject = await orchestrator.createSessionForUser(
        activatedDefaultUser.id,
      );

      return { activatedDefaultUser, defaultSessionObject };
    };

    test("returns status with content-type JSON", async () => {
      expect.hasAssertions();

      const { defaultSessionObject: sessionObject } =
        await createDefaultUserAndSession();
      const { response } = await fetchStatus(sessionObject.token);

      expectOkJsonResponse(response);
    });

    test("returns valid database status fields", async () => {
      expect.hasAssertions();

      const { defaultSessionObject: sessionObject } =
        await createDefaultUserAndSession();
      const { response, responseBody } = await fetchStatus(sessionObject.token);
      const { dependencies, updated_at: updatedAt } = responseBody;
      const { database } = dependencies;

      expectOkJsonResponse(response);
      expectStatusPayload(responseBody);
      expectValidIsoDate(updatedAt);
      expectValidDatabaseStatus(database);
    });
  });
  describe("Privileged user", () => {
    const createPrivilegedUserAndSession = async () => {
      const privilegedUser = await orchestrator.createUser();

      const activatedPrivilegedUser = await activation.activateUserByUserId(
        privilegedUser.id,
      );

      await orchestrator.addFeaturesToUser(activatedPrivilegedUser, [
        "read:status:all",
      ]);
      const privilegedSessionObject = await orchestrator.createSessionForUser(
        activatedPrivilegedUser.id,
      );

      return { activatedPrivilegedUser, privilegedSessionObject };
    };

    test("returns status with content-type JSON", async () => {
      expect.hasAssertions();

      const { privilegedSessionObject: sessionObject } =
        await createPrivilegedUserAndSession();
      const { response } = await fetchStatus(sessionObject.token);

      expectOkJsonResponse(response);
    });

    test("returns valid database status fields", async () => {
      expect.hasAssertions();

      const { privilegedSessionObject: sessionObject } =
        await createPrivilegedUserAndSession();
      const { response, responseBody } = await fetchStatus(sessionObject.token);
      const { dependencies, updated_at: updatedAt } = responseBody;
      const { database } = dependencies;

      expectOkJsonResponse(response);
      expectStatusPayload(responseBody);
      expectValidIsoDate(updatedAt);
      expectValidDatabaseStatusAll(database);
    });
  });
});
