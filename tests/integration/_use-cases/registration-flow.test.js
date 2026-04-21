import webserver from "infra/webserver";
import activation from "models/activation.js";
import user from "models/user";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
  await orchestrator.deleteAllEmails();
});

describe("Use case: Registration flow (all successful)", () => {
  let createUserResponseBody;
  let activationTokenId;
  let createSessionResponseBody;

  test("Create user account", async () => {
    const createUserResponse = await fetch(
      "http://localhost:3000/api/v1/users",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "newuser",
          email: "newuser@example.com",
          password: "validpassword",
        }),
      },
    );
    expect(createUserResponse.status).toBe(201);

    createUserResponseBody = await createUserResponse.json();
    expect(createUserResponseBody).toEqual({
      id: createUserResponseBody.id,
      username: "newuser",
      features: ["read:activation_token"],
      created_at: createUserResponseBody.created_at,
      updated_at: createUserResponseBody.updated_at,
    });
  });

  test("Receive activation email", async () => {
    const lastEmail = await orchestrator.getLastEmail();
    activationTokenId = await orchestrator.extractUUIDFromEmailText(
      lastEmail.text,
    );

    expect(lastEmail.text).toContain(
      `${webserver.origin}/cadastro/ativar/${activationTokenId}`,
    );

    const activationTokenObject =
      await activation.findOneValidById(activationTokenId);
    expect(activationTokenObject.user_id).toBe(createUserResponseBody.id);
    expect(activationTokenObject.used_at).toBeNull();

    expect(lastEmail.sender).toBe("<contato@robsonsouza.dev.br>");
    expect(lastEmail.recipients[0]).toBe("<newuser@example.com>");
    expect(lastEmail.subject).toBe("Ative seu cadastro no Robson Souza Dev!");
    expect(lastEmail.text).toContain("newuser");
  });

  test("Activate account using the link received in the email", async () => {
    const activationResponse = await fetch(
      `http://localhost:3000/api/v1/activations/${activationTokenId}`,
      {
        method: "PATCH",
      },
    );
    expect(activationResponse.status).toBe(200);

    const activationResponseBody = await activationResponse.json();
    expect(Date.parse(activationResponseBody.used_at)).not.toBeNaN();

    const activatedUser = await user.findOneByUsername(
      createUserResponseBody.username,
    );
    expect(activatedUser.features).toEqual(
      expect.arrayContaining(["read:session", "create:session"]),
    );
  });
  test("Login with the activated account", async () => {
    const loginResponse = await fetch("http://localhost:3000/api/v1/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "newuser@example.com",
        password: "validpassword",
      }),
    });
    expect(loginResponse.status).toBe(201);
    createSessionResponseBody = await loginResponse.json();
    expect(createSessionResponseBody.user_id).toBe(createUserResponseBody.id);
    expect(createSessionResponseBody.token).toBeDefined();
  });
  test("Get the user profile information using the obtained session token", async () => {
    const profileResponse = await fetch("http://localhost:3000/api/v1/user", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${createSessionResponseBody.token}`,
      },
    });
    expect(profileResponse.status).toBe(200);
    const profileResponseBody = await profileResponse.json();
    expect(profileResponseBody.id).toBe(createUserResponseBody.id);
    expect(profileResponseBody.username).toBe(createUserResponseBody.username);
  });
});
