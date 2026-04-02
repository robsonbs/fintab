import database from "infra/database";

const API_URL = "http://localhost:3000/api/v1/migrations";

async function cleanDatabase() {
  await database.query({
    text: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`,
  });
}

function expectJsonResponse(response, status) {
  expect(response.status).toBe(status);
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

test("POST /api/v1/migrations applies pending migrations and then returns an empty list on repeat", async () => {
  const response = await fetch(API_URL, {
    method: "POST",
  });
  const firstResponseBody = await response.json();

  expectJsonResponse(response, 201);
  expectMigrationList(firstResponseBody);

  const secondResponse = await fetch(API_URL, {
    method: "POST",
  });
  const secondResponseBody = await secondResponse.json();

  expectJsonResponse(secondResponse, 200);
  expect(Array.isArray(secondResponseBody)).toBe(true);
  expect(secondResponseBody.length).toEqual(0);
});
