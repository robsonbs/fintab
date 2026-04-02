import database from "infra/database";

const API_URL = "http://localhost:3000/api/v1/migrations";

async function cleanDatabase() {
  await database.query({
    text: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`,
  });
}

function expectMethodNotAllowedJsonResponse(response) {
  expect(response.status).toBe(405);
  expect(response.headers.get("content-type")).toContain("application/json");
}

beforeEach(async () => {
  await cleanDatabase();
});

test("POST /api/v1/migrations rejects unsupported HTTP methods with 405", async () => {
  const UNSUPPORTED_METHODS = ["PUT", "DELETE", "PATCH", "OPTIONS"];

  for (const method of UNSUPPORTED_METHODS) {
    const response = await fetch(API_URL, {
      method,
    });
    const responseBody = await response.json();

    expectMethodNotAllowedJsonResponse(response);
    expect(responseBody).toEqual({ error: `Method "${method}" not allowed` });
  }
});
