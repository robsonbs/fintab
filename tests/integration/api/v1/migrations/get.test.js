import activation from "models/activation";
import orchestrator from "tests/orchestrator";

const API_URL = "http://localhost:3000/api/v1/migrations";

beforeAll(async () => {
  // Aguarda os servicos antes de iniciar os cenarios de integracao.
  await orchestrator.waitForAllServices();
});

// Faz a chamada do endpoint de migrations e devolve resposta + corpo JSON.
async function fetchMigrations(sessionToken) {
  if (!sessionToken) {
    const response = await fetch(API_URL);
    const responseBody = await response.json();

    return { response, responseBody };
  }

  const response = await fetch(API_URL, {
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

function expectForrbidenJsonResponse(response) {
  expect(response.status).toBe(403);
  expect(response.headers.get("content-type")).toContain("application/json");
}

// Valida o formato minimo de uma migration retornada pela API.
// function expectValidMigration(migration) {
//   expect(migration).toEqual(
//     expect.objectContaining({
//       name: expect.any(String),
//       path: expect.any(String),
//     }),
//   );

//   expect(migration.name).not.toHaveLength(0);
//   expect(migration.path).not.toHaveLength(0);
// }

// // Valida que existe ao menos uma migration pendente e que todas sao validas.
// function expectMigrationList(migrations) {
//   expect(Array.isArray(migrations)).toBe(true);
//   expect(migrations.length).toBeGreaterThan(0);
//   migrations.forEach(expectValidMigration);
// }

// // Ordena nomes para comparacao sem depender da ordem de retorno da API.
// function getSortedMigrationNames(migrations) {
//   return migrations.map((migration) => migration.name).toSorted();
// }

// // Compara duas listas de migrations pendentes por cardinalidade e nomes.
// function expectSamePendingMigrations(firstMigrations, secondMigrations) {
//   expect(secondMigrations.length).toBe(firstMigrations.length);
//   expect(getSortedMigrationNames(secondMigrations)).toEqual(
//     getSortedMigrationNames(firstMigrations),
//   );
// }

beforeEach(async () => {
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});
describe("GET /api/v1/migrations", () => {
  describe("Anonymous user", () => {
    test("returns the list of pending migrations", async () => {
      expect.hasAssertions();

      const { response, responseBody } = await fetchMigrations();

      expectForrbidenJsonResponse(response);
      expect(responseBody).toEqual({
        message: "Você não tem permissão para acessar este recurso.",
        action: 'Verifique se o seu usuário possui a feature "read:migration"',
        name: "ForbiddenError",
        status_code: 403,
      });
    });

    test("is idempotent and returns the same pending migrations", async () => {
      expect.hasAssertions();

      const { response: firstResponse, responseBody: firstResponseBody } =
        await fetchMigrations();

      const { response: secondResponse, responseBody: secondResponseBody } =
        await fetchMigrations();

      expectForrbidenJsonResponse(firstResponse);
      expectForrbidenJsonResponse(secondResponse);
      expect(firstResponseBody).toEqual({
        message: "Você não tem permissão para acessar este recurso.",
        action: 'Verifique se o seu usuário possui a feature "read:migration"',
        name: "ForbiddenError",
        status_code: 403,
      });
      expect(secondResponseBody).toEqual({
        message: "Você não tem permissão para acessar este recurso.",
        action: 'Verifique se o seu usuário possui a feature "read:migration"',
        name: "ForbiddenError",
        status_code: 403,
      });
    });
  });

  describe("Default user", () => {
    const createDefaultUserAndSession = async () => {
      const createdUser = await orchestrator.createUser({
        username: "defaultuser",
      });
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSessionForUser(
        createdUser.id,
      );

      return { createdUser, sessionObject };
    };
    test("returns the list of pending migrations", async () => {
      expect.hasAssertions();
      const { sessionObject } = await createDefaultUserAndSession();

      const { response, responseBody } = await fetchMigrations(
        sessionObject.token,
      );

      expectForrbidenJsonResponse(response);
      expect(responseBody).toEqual({
        message: "Você não tem permissão para acessar este recurso.",
        action: 'Verifique se o seu usuário possui a feature "read:migration"',
        name: "ForbiddenError",
        status_code: 403,
      });
    });

    test("is idempotent and returns the same pending migrations", async () => {
      expect.hasAssertions();
      const { sessionObject } = await createDefaultUserAndSession();

      const { response: firstResponse, responseBody: firstResponseBody } =
        await fetchMigrations(sessionObject.token);

      const { response: secondResponse, responseBody: secondResponseBody } =
        await fetchMigrations(sessionObject.token);

      expectForrbidenJsonResponse(firstResponse);
      expectForrbidenJsonResponse(secondResponse);
      expect(firstResponseBody).toEqual({
        message: "Você não tem permissão para acessar este recurso.",
        action: 'Verifique se o seu usuário possui a feature "read:migration"',
        name: "ForbiddenError",
        status_code: 403,
      });
      expect(secondResponseBody).toEqual({
        message: "Você não tem permissão para acessar este recurso.",
        action: 'Verifique se o seu usuário possui a feature "read:migration"',
        name: "ForbiddenError",
        status_code: 403,
      });
    });
  });

  describe("Privileged user", () => {
    const createPrivilegedUserAndSession = async () => {
      const privilegedUser = await orchestrator.createUser();

      const activatedPrivilegedUser = await activation.activateUserByUserId(
        privilegedUser.id,
      );

      await orchestrator.addFeaturesToUser(activatedPrivilegedUser, [
        "read:migration",
        "create:migration",
      ]);

      const privilegedSessionObject = await orchestrator.createSessionForUser(
        activatedPrivilegedUser.id,
      );

      return { activatedPrivilegedUser, privilegedSessionObject };
    };

    test("returns the list of pending migrations", async () => {
      expect.hasAssertions();

      const { privilegedSessionObject: sessionObject } =
        await createPrivilegedUserAndSession();

      const { response, responseBody } = await fetchMigrations(
        sessionObject.token,
      );

      expectOkJsonResponse(response);
      expect(Array.isArray(responseBody)).toBe(true);
    });

    test("is idempotent and returns the same pending migrations", async () => {
      expect.hasAssertions();

      const { privilegedSessionObject: sessionObject } =
        await createPrivilegedUserAndSession();
      const { response: firstResponse, responseBody: firstResponseBody } =
        await fetchMigrations(sessionObject.token);

      const { response: secondResponse, responseBody: secondResponseBody } =
        await fetchMigrations(sessionObject.token);

      expectOkJsonResponse(firstResponse);
      expectOkJsonResponse(secondResponse);
      expect(Array.isArray(firstResponseBody)).toBe(true);
      expect(firstResponseBody).toHaveLength(0);
      expect(Array.isArray(secondResponseBody)).toBe(true);
      expect(secondResponseBody).toHaveLength(0);
    });
  });
});
