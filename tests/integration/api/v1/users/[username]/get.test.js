import { version as uuidVersion } from "uuid";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

beforeEach(async () => {
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/users/[username]", () => {
  describe("Anonymous user", () => {
    test("With exactly matching username", async () => {
      const createdUser = await orchestrator.createUser({
        username: "robsonBS",
      });
      const response = await fetch(
        `http://localhost:3000/api/v1/users/${createdUser.username}`,
      );
      expect(response.status).toEqual(200);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: createdUser.id,
        username: "robsonBS",
        email: createdUser.email,
        password: responseBody.password,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });
      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();
    });

    test("With non-exact matching username", async () => {
      const createdUser = await orchestrator.createUser({
        username: "robsonBS",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/users/${createdUser.username.toLowerCase()}`,
      );
      expect(response.status).toEqual(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: createdUser.id,
        username: "robsonBS",
        email: createdUser.email,
        password: responseBody.password,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });
      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();
    });

    test("Should return user data", async () => {
      const createdUser = await orchestrator.createUser({
        username: "robsonbs",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/users/${createdUser.username}`,
      );
      expect(response.status).toEqual(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: createdUser.id,
        username: "robsonbs",
        email: createdUser.email,
        password: responseBody.password,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });
      expect(uuidVersion(responseBody.id)).toBe(4);
    });

    test("Should return 404 for non-existing user", async () => {
      const response = await fetch(
        "http://localhost:3000/api/v1/users/nonexistinguser",
      );
      expect(response.status).toEqual(404);
      const responseBody = await response.json();
      expect(responseBody.name).toEqual("NotFoundError");
      expect(responseBody.message).toEqual(
        "O username informado não foi encontrado no sistema.",
      );
      expect(responseBody.action).toEqual(
        "Verifique se o username foi digitado corretamente.",
      );
      expect(responseBody.status_code).toEqual(404);
    });
  });
});
