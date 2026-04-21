import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import password from "models/password.js";
import { version as uuidVersion } from "uuid";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

beforeEach(async () => {
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/users", () => {
  describe("Anonymous user", () => {
    test("With unique and valid data", async () => {
      const response = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "robsonbs",
          email: "contato@robsonsouza.dev.br",
          password: "senha123",
        }),
      });
      expect(response.status).toEqual(201);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: responseBody.id,
        username: "robsonbs",
        features: ["read:activation_token"],
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });
      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();
      const userInDatabase = await user.findOneByUsername(
        responseBody.username,
      );
      const correctPasswordMatch = await password.compare(
        "senha123",
        userInDatabase.password,
      );
      const incorrectPasswordMatch = await password.compare(
        "senhaErrada",
        userInDatabase.password,
      );
      expect(incorrectPasswordMatch).toBe(false);
      expect(correctPasswordMatch).toBe(true);
    });

    test('With duplicated "email"', async () => {
      const response1 = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "emailduplicado1",
          email: "duplicado@robsonsouza.dev.br",
          password: "senha123",
        }),
      });
      expect(response1.status).toEqual(201);

      const response = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "emailduplicado2",
          email: "duplicado@robsonsouza.dev.br",
          password: "senha123",
        }),
      });
      expect(response.status).toEqual(400);
      const responseBody = await response.json();
      expect(responseBody.name).toEqual("ValidationError");
      expect(responseBody.message).toEqual(
        "O email informado já está sendo utilizado.",
      );
      expect(responseBody.action).toEqual(
        "Utilize outro email para realizar esta operação.",
      );

      expect(responseBody.status_code).toEqual(400);
    });

    test('With duplicated "username"', async () => {
      await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "robsonbs",
          email: "contato3@robsonsouza.dev.br",
          password: "senha123",
        }),
      });

      const response = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "RobsonBS",
          email: "contato1@robsonsouza.dev.br",
          password: "senha123",
        }),
      });
      expect(response.status).toEqual(400);
      const responseBody = await response.json();
      expect(responseBody.name).toEqual("ValidationError");
      expect(responseBody.message).toEqual(
        "O username informado já está sendo utilizado.",
      );
      expect(responseBody.action).toEqual(
        "Utilize outro username para realizar esta operação.",
      );

      expect(responseBody.status_code).toEqual(400);
    });
  });

  describe("Default user", () => {
    test("With unique and valid data", async () => {
      const user1 = await orchestrator.createUser();
      await orchestrator.activateUser(user1);
      const user1SessionObject = await orchestrator.createSessionForUser(
        user1.id,
      );

      const response = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${user1SessionObject.token}`,
        },
        body: JSON.stringify({
          username: "robsonbs",
          email: "contato4@robsonsouza.dev.br",
          password: "senha123",
        }),
      });
      expect(response.status).toEqual(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        action: 'Verifique se o seu usuário possui a feature "create:user"',
        message: "Você não tem permissão para acessar este recurso.",
        name: "ForbiddenError",
        status_code: 403,
      });
    });
  });
});
