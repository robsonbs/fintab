import { version as uuidVersion } from "uuid";
import setCookieParser from "set-cookie-parser";
import session from "models/session.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

beforeEach(async () => {
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/sessions", () => {
  describe("Anonymous user", () => {
    test("with incorrect `email` but correct `password` should return 401", async () => {
      await orchestrator.createUser({
        password: "correct-password",
      });

      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "invalid@example.com",
          password: "correct-password",
        }),
      });

      expect(response.status).toBe(401);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        message: "Dados de autenticação não conferem.",
        action: "Verifique se o email e a senha estão corretos.",
        name: "UnauthorizedError",
        status_code: 401,
      });
    });

    test("with correct `email` but incorrect `password` should return 401", async () => {
      await orchestrator.createUser({
        email: "valid@example.com",
      });

      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "valid@example.com",
          password: "incorrect-password",
        }),
      });

      expect(response.status).toBe(401);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        message: "Dados de autenticação não conferem.",
        action: "Verifique se o email e a senha estão corretos.",
        name: "UnauthorizedError",
        status_code: 401,
      });
    });

    test("with incorrect `email` and incorrect `password` should return 401", async () => {
      await orchestrator.createUser();
      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "invalid@example.com",
          password: "incorrect-password",
        }),
      });

      expect(response.status).toBe(401);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        message: "Dados de autenticação não conferem.",
        action: "Verifique se o email e a senha estão corretos.",
        name: "UnauthorizedError",
        status_code: 401,
      });
    });
    test("with correct `email` and correct `password` should return 201", async () => {
      const user = await orchestrator.createUser({
        email: "tudo.correto@curso.dev",
        password: "tudo-correto",
      });

      await orchestrator.activateUser(user);

      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "tudo.correto@curso.dev",
          password: "tudo-correto",
        }),
      });

      expect(response.status).toBe(201);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: responseBody.id,
        token: responseBody.token,
        user_id: user.id,
        expires_at: responseBody.expires_at,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.expires_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();

      const expires_at = new Date(responseBody.expires_at);
      const created_at = new Date(responseBody.created_at);

      expires_at.setMilliseconds(0);
      created_at.setMilliseconds(0);

      expect(expires_at.getTime() - created_at.getTime()).toBe(
        session.EXPIRATION_IN_MILLISECONDS,
      );

      const parsedSetCookie = setCookieParser(response, {
        map: true,
      });

      expect(parsedSetCookie.session_id).toEqual({
        name: "session_id",
        value: responseBody.token,
        path: "/",
        httpOnly: true,
        sameSite: "Strict",
        maxAge: session.EXPIRATION_IN_MILLISECONDS / 1000,
      });
    });
  });
});
