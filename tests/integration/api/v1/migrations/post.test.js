import activation from "models/activation";
import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  // Aguarda os servicos antes de iniciar os cenarios de integracao.
  await orchestrator.waitForAllServices();
});

const API_URL = "http://localhost:3000/api/v1/migrations";

function expectJsonResponse(response, status) {
  expect(response.status).toBe(status);
  expect(response.headers.get("content-type")).toContain("application/json");
}

// // Valida o formato minimo de uma migration retornada pela API.
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

// // Valida lista nao vazia de migrations aplicadas/pendentes.
// function expectMigrationList(migrations) {
//   console.log("Received migrations:", migrations); // Log para depuração
//   expect(Array.isArray(migrations)).toBe(true);
//   expect(migrations.length).toBeGreaterThan(0);
//   migrations.forEach(expectValidMigration);
// }

// // Valida lista vazia para o caso em que nao ha migrations para aplicar.
// function expectEmptyMigrationList(migrations) {
//   expect(Array.isArray(migrations)).toBe(true);
//   expect(migrations).toHaveLength(0);
// }

// Executa o POST de migrations e retorna resposta + corpo JSON.
async function postMigrations(sessionToken) {
  if (!sessionToken) {
    const response = await fetch(API_URL, {
      method: "POST",
    });
    const responseBody = await response.json();

    return { response, responseBody };
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      cookie: `session_id=${sessionToken}`,
    },
  });
  const responseBody = await response.json();

  return { response, responseBody };
}

beforeEach(async () => {
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/migrations", () => {
  describe("Anonymous user", () => {
    test("applies pending migrations and returns them in the response", async () => {
      expect.hasAssertions();

      const { response, responseBody } = await postMigrations();

      expectJsonResponse(response, 403);
      expect(responseBody).toEqual({
        message: "Você não tem permissão para acessar este recurso.",
        action:
          'Verifique se o seu usuário possui a feature "create:migration"',
        name: "ForbiddenError",
        status_code: 403,
      });
    });

    test("returns an empty list on repeat call with no new migrations", async () => {
      expect.hasAssertions();

      await postMigrations(); // Aplica as migrations pendentes na primeira chamada.
      const { response, responseBody } = await postMigrations(); // Segunda chamada sem novas migrations.

      expectJsonResponse(response, 403);
      expect(responseBody).toEqual({
        message: "Você não tem permissão para acessar este recurso.",
        action:
          'Verifique se o seu usuário possui a feature "create:migration"',
        name: "ForbiddenError",
        status_code: 403,
      });
    });
  });

  describe("Default user", () => {
    const createDefaultUserAndSession = async () => {
      const defaultUser = await orchestrator.createUser();
      await activation.activateUserByUserId(defaultUser.id);
      const sessionObject = await orchestrator.createSessionForUser(
        defaultUser.id,
      );

      return { defaultUser, defaultSessionObject: sessionObject };
    };
    test("applies pending migrations and returns them in the response", async () => {
      expect.hasAssertions();
      const { defaultSessionObject: sessionObject } =
        await createDefaultUserAndSession();

      const { response, responseBody } = await postMigrations(
        sessionObject.token,
      );

      expectJsonResponse(response, 403);
      expect(responseBody).toEqual({
        message: "Você não tem permissão para acessar este recurso.",
        action:
          'Verifique se o seu usuário possui a feature "create:migration"',
        name: "ForbiddenError",
        status_code: 403,
      });
    });

    test("returns an empty list on repeat call with no new migrations", async () => {
      expect.hasAssertions();

      const { defaultSessionObject: sessionObject } =
        await createDefaultUserAndSession();
      await postMigrations(sessionObject.token); // Aplica as migrations pendentes na primeira chamada.
      const { response, responseBody } = await postMigrations(
        sessionObject.token,
      ); // Segunda chamada sem novas migrations.

      expectJsonResponse(response, 403);
      expect(responseBody).toEqual({
        message: "Você não tem permissão para acessar este recurso.",
        action:
          'Verifique se o seu usuário possui a feature "create:migration"',
        name: "ForbiddenError",
        status_code: 403,
      });
    });
  });

  describe("Privileged user", () => {
    const createPrivilegedUserAndSession = async () => {
      const privilegedUser = await orchestrator.createUser();
      await activation.activateUserByUserId(privilegedUser.id);
      await orchestrator.addFeaturesToUser(privilegedUser, [
        "read:migration",
        "create:migration",
      ]);
      const sessionObject = await orchestrator.createSessionForUser(
        privilegedUser.id,
      );

      return { privilegedUser, privilegedSessionObject: sessionObject };
    };

    test("applies pending migrations and returns them in the response", async () => {
      expect.hasAssertions();

      const { privilegedSessionObject: sessionObject } =
        await createPrivilegedUserAndSession();

      const { response, responseBody } = await postMigrations(
        sessionObject.token,
      );

      expectJsonResponse(response, 200);
      expect(Array.isArray(responseBody)).toBe(true);
      expect(responseBody).toHaveLength(0);
    });

    test("returns an empty list on repeat call with no new migrations", async () => {
      expect.hasAssertions();

      const { privilegedSessionObject: sessionObject } =
        await createPrivilegedUserAndSession();
      await postMigrations(sessionObject.token); // Aplica as migrations pendentes na primeira chamada.
      const { response, responseBody } = await postMigrations(
        sessionObject.token,
      ); // Segunda chamada sem novas migrations.

      expectJsonResponse(response, 200);
      expect(Array.isArray(responseBody)).toBe(true);
      expect(responseBody).toHaveLength(0);
    });
  });
});
