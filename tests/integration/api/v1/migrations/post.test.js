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

// Valida o formato minimo de uma migration retornada pela API.
function expectValidMigration(migration) {
  expect(migration).toEqual(
    expect.objectContaining({
      name: expect.any(String),
      path: expect.any(String),
    }),
  );

  expect(migration.name).not.toHaveLength(0);
  expect(migration.path).not.toHaveLength(0);
}

// Valida lista nao vazia de migrations aplicadas/pendentes.
function expectMigrationList(migrations) {
  expect(Array.isArray(migrations)).toBe(true);
  expect(migrations.length).toBeGreaterThan(0);
  migrations.forEach(expectValidMigration);
}

// Valida lista vazia para o caso em que nao ha migrations para aplicar.
function expectEmptyMigrationList(migrations) {
  expect(Array.isArray(migrations)).toBe(true);
  expect(migrations).toHaveLength(0);
}

// Executa o POST de migrations e retorna resposta + corpo JSON.
async function postMigrations() {
  const response = await fetch(API_URL, {
    method: "POST",
  });
  const responseBody = await response.json();

  return { response, responseBody };
}

beforeEach(async () => {
  await orchestrator.clearDatabase();
});

describe("POST /api/v1/migrations", () => {
  describe("Anonymous user", () => {
    test("applies pending migrations and returns them in the response", async () => {
      expect.hasAssertions();

      const { response, responseBody } = await postMigrations();

      expectJsonResponse(response, 201);
      expectMigrationList(responseBody);
    });

    test("returns an empty list on repeat call with no new migrations", async () => {
      expect.hasAssertions();

      await postMigrations(); // Aplica as migrations pendentes na primeira chamada.
      const { response, responseBody } = await postMigrations(); // Segunda chamada sem novas migrations.

      expectJsonResponse(response, 200);
      expectEmptyMigrationList(responseBody);
    });
  });
});
