test("GET to /api/v1/status should return 200", async () => {
  const response = await fetch("http://localhost:3000/api/v1/status");
  expect(response.status).toBe(200);
});

test("GET to /api/v1/status should return status ok", async () => {
  const response = await fetch("http://localhost:3000/api/v1/status");
  const responseBody = await response.json();

  expect(response.status).toBe(200);
  expect(responseBody.updated_at).toBeDefined();
  const parsedUpdatedAt = new Date(responseBody.updated_at).toISOString();

  expect(responseBody.updated_at).toEqual(parsedUpdatedAt);
  expect(responseBody.dependencies.database.version).toBeDefined();
  expect(responseBody.dependencies.database.version).toBe("16.0");

  expect(responseBody.dependencies.database.max_connections).toBeDefined();
  expect(responseBody.dependencies.database.max_connections).toBe(100);

  expect(responseBody.dependencies.database.open_connections).toBeDefined();
  expect(responseBody.dependencies.database.open_connections).toEqual(1);
});
