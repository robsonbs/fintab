import orchestrator from "tests/orchestrator";

const API_URL = "http://localhost:3000/api/v1/migrations";

beforeAll(async () => {
  // Aguarda os servicos antes de iniciar os cenarios de integracao.
  await orchestrator.waitForAllServices();
});

// Faz a chamada do endpoint de migrations e devolve resposta + corpo JSON.
async function fetchMigrations() {
  const response = await fetch(API_URL);
  const responseBody = await response.json();

  return { response, responseBody };
}

function expectOkJsonResponse(response) {
  expect(response.status).toBe(200);
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

// Valida que existe ao menos uma migration pendente e que todas sao validas.
function expectMigrationList(migrations) {
  expect(Array.isArray(migrations)).toBe(true);
  expect(migrations.length).toBeGreaterThan(0);
  migrations.forEach(expectValidMigration);
}

// Ordena nomes para comparacao sem depender da ordem de retorno da API.
function getSortedMigrationNames(migrations) {
  return migrations.map((migration) => migration.name).toSorted();
}

// Compara duas listas de migrations pendentes por cardinalidade e nomes.
function expectSamePendingMigrations(firstMigrations, secondMigrations) {
  expect(secondMigrations.length).toBe(firstMigrations.length);
  expect(getSortedMigrationNames(secondMigrations)).toEqual(
    getSortedMigrationNames(firstMigrations),
  );
}

beforeEach(async () => {
  await orchestrator.clearDatabase();
});

test("GET /api/v1/migrations returns the list of pending migrations", async () => {
  const { response, responseBody } = await fetchMigrations();

  expectOkJsonResponse(response);
  expectMigrationList(responseBody);
});

test("GET /api/v1/migrations is idempotent and returns the same pending migrations", async () => {
  const { response: firstResponse, responseBody: firstResponseBody } =
    await fetchMigrations();

  const { response: secondResponse, responseBody: secondResponseBody } =
    await fetchMigrations();

  expectOkJsonResponse(firstResponse);
  expectOkJsonResponse(secondResponse);
  expectMigrationList(firstResponseBody);
  expectMigrationList(secondResponseBody);
  expectSamePendingMigrations(firstResponseBody, secondResponseBody);
});
