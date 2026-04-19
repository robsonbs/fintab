import orchestrator from "tests/orchestrator.js";
import session from "models/session.js";
import setCookieParser from "set-cookie-parser";
import { version as uuidVersion } from "uuid";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

beforeEach(async () => {
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/user", () => {
  describe("Anonymous user", () => {
    test("With valid session", async () => {
      const createdUser = await orchestrator.createUser({
        username: "UserWithValidSession",
      });
      const sessionObject = await orchestrator.createSessionForUser(
        createdUser.id,
      );

      const response = await fetch("http://localhost:3000/api/v1/user", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${sessionObject.token}`,
        },
      });

      expect(response.status).toBe(200);
      const cacheControl = response.headers.get("Cache-Control");
      expect(cacheControl).toBe(
        "no-store, no-cache, max-age=0, must-revalidate",
      );

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: createdUser.id,
        username: createdUser.username,
        email: createdUser.email,
        password: createdUser.password,
        created_at: createdUser.created_at.toISOString(),
        updated_at: createdUser.updated_at.toISOString(),
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();

      // Check if the session was renewed
      const renewedSessionObject = await session.findOneValidByToken(
        sessionObject.token,
      );
      expect(renewedSessionObject).not.toBeNull();
      expect(renewedSessionObject.expires_at.getTime()).toBeGreaterThan(
        sessionObject.expires_at.getTime(),
      );
      expect(renewedSessionObject.updated_at.getTime()).toBeGreaterThan(
        sessionObject.updated_at.getTime(),
      );

      // set-cookie header should be present and have the same token
      const parsedSetCookie = setCookieParser(response, {
        map: true,
      });

      expect(parsedSetCookie.session_id).toEqual({
        name: "session_id",
        value: sessionObject.token,
        path: "/",
        httpOnly: true,
        sameSite: "Strict",
        maxAge: session.EXPIRATION_IN_MILLISECONDS / 1000,
      });
    });

    test("With nonexistent session", async () => {
      const response = await fetch("http://localhost:3000/api/v1/user", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Cookie: "session_id=168bbe1a-d4a8-4bee-9cf8-d5116a471900",
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
      });

      const createdUser = await orchestrator.createUser({
        username: "UserWithExpiredSession",
      });

      const sessionObject = await orchestrator.createSessionForUser(
        createdUser.id,
      );
      jest.useRealTimers();
      const response = await fetch("http://localhost:3000/api/v1/user", {
        headers: {
          Cookie: `session_id=${sessionObject.token}`,
        },
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        name: "UnauthorizedError",
        message: "Usuário não possui sessão ativa.",
        action: "Verifique se este usuário está logado e tente novamente.",
        status_code: 401,
      });
    });
  });
});
