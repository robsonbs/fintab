import webserver from "infra/webserver";
import activation from "models/activation.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
  await orchestrator.deleteAllEmails();
});

describe("Use case: Registration flow (all successful)", () => {
  let createUserResponseBody;
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
      email: "newuser@example.com",
      features: ["read:activation_token"],
      password: createUserResponseBody.password,
      created_at: createUserResponseBody.created_at,
      updated_at: createUserResponseBody.updated_at,
    });
  });

  test("Receive activation email", async () => {
    const lastEmail = await orchestrator.getLastEmail();
    const activationToken = await orchestrator.extractUUIDFromEmailText(
      lastEmail.text,
    );

    expect(lastEmail.text).toContain(
      `${webserver.origin}/singup/activate/${activationToken}`,
    );

    const activationTokenObject =
      await activation.findOneValidById(activationToken);
    expect(activationTokenObject.user_id).toBe(createUserResponseBody.id);
    expect(activationTokenObject.used_at).toBeNull();

    expect(lastEmail.sender).toBe("<contato@robsonsouza.dev.br>");
    expect(lastEmail.recipients[0]).toBe("<newuser@example.com>");
    expect(lastEmail.subject).toBe("Ative seu cadastro no Robson Souza Dev!");
    expect(lastEmail.text).toContain("newuser");
  });
  test.todo("Activate account using the link received in the email");
  test.todo("Login with the activated account");
  test.todo(
    "Get the user profile information using the obtained session token",
  );
});
