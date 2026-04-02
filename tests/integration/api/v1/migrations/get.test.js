import database from "infra/database";

const API_URL = "http://localhost:3000/api/v1/migrations";

async function cleanDatabase() {
  await database.query({
    text: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`,
  });
}

function expectOkJsonResponse(response) {
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("application/json");
}

function expectMigrationList(migrations) {
  expect(Array.isArray(migrations)).toBe(true);
  expect(migrations.length).toBeGreaterThan(0);

  migrations.forEach((migration) => {
    expect(migration).toEqual(
      expect.objectContaining({
        name: expect.any(String),
        path: expect.any(String),
      }),
    );
    expect(migration.name).not.toHaveLength(0);
    expect(migration.path).not.toHaveLength(0);
  });
}

beforeEach(async () => {
  await cleanDatabase();
});

test("GET /api/v1/migrations returns the pending migrations list", async () => {
  const response = await fetch(API_URL);
  const responseBody = await response.json();

  expectOkJsonResponse(response);
  expectMigrationList(responseBody);
});

test("GET /api/v1/migrations is repeatable and returns the same pending migrations", async () => {
  const firstResponse = await fetch(API_URL);
  const firstResponseBody = await firstResponse.json();

  const secondResponse = await fetch(API_URL);
  const secondResponseBody = await secondResponse.json();

  expectOkJsonResponse(firstResponse);
  expectOkJsonResponse(secondResponse);
  expectMigrationList(firstResponseBody);
  expectMigrationList(secondResponseBody);

  expect(secondResponseBody.length).toBe(firstResponseBody.length);

  const firstMigrationNames = firstResponseBody.map(
    (migration) => migration.name,
  );
  const secondMigrationNames = secondResponseBody.map(
    (migration) => migration.name,
  );
  expect(secondMigrationNames.sort()).toEqual(firstMigrationNames.sort());
});
