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

test("POST /api/v1/migrations applies pending migrations and then returns an empty list on repeat", async () => {
  expect.hasAssertions();

  const { response: firstResponse, responseBody: firstResponseBody } =
    await postMigrations();

  expectJsonResponse(firstResponse, 201);
  expectMigrationList(firstResponseBody);

  const { response: secondResponse, responseBody: secondResponseBody } =
    await postMigrations();

  expectJsonResponse(secondResponse, 200);
  expectEmptyMigrationList(secondResponseBody);
});
