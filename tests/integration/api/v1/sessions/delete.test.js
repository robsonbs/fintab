import orchestrator from "tests/orchestrator.js";
import session from "models/session.js";
import setCookieParser from "set-cookie-parser";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

beforeEach(async () => {
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/sessions", () => {
  describe("Default user", () => {
    test("With non-existent session", async () => {
      const nonexistentToken = "00000000-0000-0000-0000-000000000000";
      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "DELETE",
        headers: {
          cookie: `session_id=${nonexistentToken}`,
        },
      });
      expect(response.status).toBe(401);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        message: "Usuário não possui sessão ativa.",
        action: "Verifique se este usuário está logado e tente novamente.",
        name: "UnauthorizedError",
        status_code: 401,
      });
    });

    test("With expired session", async () => {
      jest.useFakeTimers({
        now: new Date(
          Date.now() - session.EXPIRATION_IN_MILLISECONDS,
        ).getTime(),
        doNotFake: ["nextTick"],
      });
      const createUser = await orchestrator.createUser();
      const sessionObject = await orchestrator.createSessionForUser(
        createUser.id,
      );
      jest.useRealTimers();

      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "DELETE",
        headers: {
          cookie: `session_id=${sessionObject.token}`,
        },
      });
      expect(response.status).toBe(401);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        message: "Usuário não possui sessão ativa.",
        action: "Verifique se este usuário está logado e tente novamente.",
        name: "UnauthorizedError",
        status_code: 401,
      });
    });

    test("With valid session", async () => {
      const createUser = await orchestrator.createUser();
      await orchestrator.activateUser(createUser);
      const sessionObject = await orchestrator.createSessionForUser(
        createUser.id,
      );

      const response = await fetch("http://localhost:3000/api/v1/sessions", {
        method: "DELETE",
        headers: {
          cookie: `session_id=${sessionObject.token}`,
        },
      });
      expect(response.status).toBe(200);
      const setCookieHeader = response.headers.get("set-cookie");
      expect(setCookieHeader).toBeTruthy();

      const cookies = setCookieParser.parse(setCookieHeader);
      const sessionCookie = cookies.find(
        (cookie) => cookie.name === "session_id",
      );
      expect(sessionCookie).toBeTruthy();
      expect(sessionCookie.value).toBe("invalid");

      const responseBody = await response.json();
      expect(responseBody).toMatchObject({
        id: sessionObject.id,
        user_id: createUser.id,
        token: sessionObject.token,
        expires_at: responseBody.expires_at,
        created_at: sessionObject.created_at.toISOString(),
        updated_at: responseBody.updated_at,
      });
      expect(
        responseBody.expires_at < sessionObject.expires_at.toISOString(),
      ).toBeTruthy();
      expect(
        responseBody.updated_at > sessionObject.updated_at.toISOString(),
      ).toBeTruthy();
      expect(
        Date.parse(responseBody.expires_at) -
          Date.parse(responseBody.updated_at),
      ).toBeLessThanOrEqual(session.EXPIRATION_IN_MILLISECONDS);

      const parsedSetCookie = setCookieParser(response, {
        map: true,
      });

      expect(parsedSetCookie.session_id).toEqual({
        name: "session_id",
        value: "invalid",
        path: "/",
        httpOnly: true,
        sameSite: "Strict",
        maxAge: -1,
      });

      // Double check assertions
      const doubleCheckResponse = await fetch(
        "http://localhost:3000/api/v1/user",
        {
          method: "GET",
          headers: {
            cookie: `session_id=${sessionObject.token}`,
          },
        },
      );
      expect(doubleCheckResponse.status).toBe(401);

      const doubleCheckResponseBody = await doubleCheckResponse.json();
      expect(doubleCheckResponseBody).toEqual({
        message: "Usuário não possui sessão ativa.",
        action: "Verifique se este usuário está logado e tente novamente.",
        name: "UnauthorizedError",
        status_code: 401,
      });
    });
  });
});
