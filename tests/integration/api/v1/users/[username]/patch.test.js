import activation from "models/activation.js";
import password from "models/password.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  // Aguarda os servicos antes de iniciar os cenarios de integracao.
  await orchestrator.waitForAllServices();
});

beforeEach(async () => {
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("PATCH /api/v1/users/[username]", () => {
  describe("Anonymous user", () => {
    test("With non-existing username", async () => {
      const response = await fetch(
        "http://localhost:3000/api/v1/users/usuarioInexistente",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: "novoemail@robsonsouza.dev.br",
          }),
        },
      );
      expect(response.status).toEqual(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        action: 'Verifique se o seu usuário possui a feature "update:user"',
        message: "Você não tem permissão para acessar este recurso.",
        name: "ForbiddenError",
        status_code: 403,
      });
    });

    test("With unique username and email", async () => {
      const createdUser = await orchestrator.createUser({
        username: "usuario1",
        email: "usuario1@robsonsouza.dev.br",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/users/${createdUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: "usuario2",
            email: "usuario2@robsonsouza.dev.br",
          }),
        },
      );
      expect(response.status).toEqual(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        action: 'Verifique se o seu usuário possui a feature "update:user"',
        message: "Você não tem permissão para acessar este recurso.",
        name: "ForbiddenError",
        status_code: 403,
      });
    });
  });

  describe("Default user", () => {
    test("With non-existing username", async () => {
      const createdUser = await orchestrator.createUser();
      const sessionObject = await orchestrator.createSessionForUser(
        createdUser.id,
      );
      await activation.activateUserByUserId(createdUser.id);

      const response = await fetch(
        "http://localhost:3000/api/v1/users/usuarioInexistente",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({
            email: "novoemail@robsonsouza.dev.br",
          }),
        },
      );
      expect(response.status).toEqual(404);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        action: "Verifique se o username foi digitado corretamente.",
        message: "O username informado não foi encontrado no sistema.",
        name: "NotFoundError",
        status_code: 404,
      });
    });

    test("with duplicated 'username'", async () => {
      const createdUser1 = await orchestrator.createUser({
        username: "usuario1",
      });

      const updatedUser1 = await activation.activateUserByUserId(
        createdUser1.id,
      );
      const sessionObject = await orchestrator.createSessionForUser(
        updatedUser1.id,
      );

      await orchestrator.createUser({
        username: "usuario2",
      });

      const response = await fetch(
        "http://localhost:3000/api/v1/users/usuario1",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({
            username: "usuario2",
          }),
        },
      );
      expect(response.status).toEqual(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        message: "O username informado já está sendo utilizado.",
        action: "Utilize outro username para realizar esta operação.",
        name: "ValidationError",
        status_code: 400,
      });
    });

    test("With duplicated 'email'", async () => {
      const createdUser1 = await orchestrator.createUser({
        email: "usuario1@robsonsouza.dev.br",
      });
      const updatedUser1 = await activation.activateUserByUserId(
        createdUser1.id,
      );
      const sessionObject = await orchestrator.createSessionForUser(
        updatedUser1.id,
      );

      await orchestrator.createUser({
        email: "usuario2@robsonsouza.dev.br",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/users/${createdUser1.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({
            email: "usuario2@robsonsouza.dev.br",
          }),
        },
      );
      expect(response.status).toEqual(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        message: "O email informado já está sendo utilizado.",
        action: "Utilize outro email para realizar esta operação.",
        name: "ValidationError",
        status_code: 400,
      });
    });

    test("should return 200 when updating username with a case change", async () => {
      // Arrange
      const createdUser = await orchestrator.createUser({
        username: "username",
        email: "usuario2@robsonsouza.dev.br",
        password: "senha123",
      });
      await activation.activateUserByUserId(createdUser.id);
      const sessionObject = await orchestrator.createSessionForUser(
        createdUser.id,
      );

      const payload = { username: "Username" };

      // Act
      const response = await fetch(
        `http://localhost:3000/api/v1/users/${createdUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      // Assert
      const responseBody = await response.json();
      expect(response.status).toEqual(200);
      expect(responseBody.username).toEqual("Username");
    });

    test("With unique email", async () => {
      const createdUser = await orchestrator.createUser({
        username: "usuario1",
        email: "usuario1@robsonsouza.dev.br",
        password: "senha123",
      });
      const sessionObject = await orchestrator.createSessionForUser(
        createdUser.id,
      );
      await activation.activateUserByUserId(createdUser.id);
      const payload = { email: "usuario2@robsonsouza.dev.br" };
      const response = await fetch(
        `http://localhost:3000/api/v1/users/${createdUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify(payload),
        },
      );
      expect(response.status).toEqual(200);
      const responseBody = await response.json();
      expect(responseBody.email).toEqual("usuario2@robsonsouza.dev.br");
      expect(responseBody.password).toEqual(createdUser.password);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();
      expect(responseBody.updated_at > responseBody.created_at).toEqual(true);
    });
    test("With unique username", async () => {
      const createdUser = await orchestrator.createUser({
        username: "usuario1",
        email: "usuario1@robsonsouza.dev.br",
        password: "senha123",
      });
      const sessionObject = await orchestrator.createSessionForUser(
        createdUser.id,
      );
      await activation.activateUserByUserId(createdUser.id);
      const response = await fetch(
        `http://localhost:3000/api/v1/users/${createdUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({
            username: "usuario2",
          }),
        },
      );
      expect(response.status).toEqual(200);
      const responseBody = await response.json();
      expect(responseBody.username).toEqual("usuario2");
      expect(responseBody.password).toEqual(createdUser.password);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();
      expect(responseBody.updated_at > responseBody.created_at).toEqual(true);
    });
    test("With unique username and email", async () => {
      const createdUser = await orchestrator.createUser({
        username: "usuario1",
        email: "usuario1@robsonsouza.dev.br",
      });

      const sessionObject = await orchestrator.createSessionForUser(
        createdUser.id,
      );
      await activation.activateUserByUserId(createdUser.id);

      const response = await fetch(
        `http://localhost:3000/api/v1/users/${createdUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({
            username: "usuario2",
            email: "usuario2@robsonsouza.dev.br",
          }),
        },
      );
      expect(response.status).toEqual(200);
      const responseBody = await response.json();
      expect(responseBody.username).toEqual("usuario2");
      expect(responseBody.email).toEqual("usuario2@robsonsouza.dev.br");
      expect(responseBody.password).toEqual(createdUser.password);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();
      expect(responseBody.updated_at > responseBody.created_at).toEqual(true);
    });

    test("With password update", async () => {
      const createdUser = await orchestrator.createUser({
        password: "senha123",
      });

      const passwordHashBeforeUpdate = await password.compare(
        "senha123",
        createdUser.password,
      );
      const sessionObject = await orchestrator.createSessionForUser(
        createdUser.id,
      );
      await activation.activateUserByUserId(createdUser.id);

      expect(passwordHashBeforeUpdate).toEqual(true);
      const response = await fetch(
        `http://localhost:3000/api/v1/users/${createdUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({
            password: "novaSenha123",
          }),
        },
      );
      expect(response.status).toEqual(200);
      const responseBody = await response.json();
      expect(responseBody.username).toEqual(createdUser.username);
      const passwordHashAfterUpdate = await password.compare(
        "novaSenha123",
        responseBody.password,
      );
      expect(passwordHashAfterUpdate).toEqual(true);
    });

    test("With no fields to update", async () => {
      const createdUser = await orchestrator.createUser({
        username: "usuario1",
        email: "usuario1@robsonsouza.dev.br",
        password: "senha123",
      });

      const sessionObject = await orchestrator.createSessionForUser(
        createdUser.id,
      );
      await activation.activateUserByUserId(createdUser.id);

      const response = await fetch(
        `http://localhost:3000/api/v1/users/${createdUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({}),
        },
      );

      expect(response.status).toEqual(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        message: "O payload não pode estar vazio.",
        action: "Envie pelo menos um campo válido para atualizar.",
        name: "ValidationError",
        status_code: 400,
      });
    });
  });
});
