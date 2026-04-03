import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  // Aguarda os servicos antes de iniciar os cenarios de integracao.
  await orchestrator.waitForAllServices();
});

const API_URL = "http://localhost:3000/api/v1/migrations";
const UNSUPPORTED_METHODS = ["PUT", "DELETE", "PATCH", "OPTIONS"];

function expectMethodNotAllowedJsonResponse(response) {
  expect(response.status).toBe(405);
  expect(response.headers.get("content-type")).toContain("application/json");
}

// Valida que a API informa os metodos suportados via header Allow.
function expectAllowedMethodsHeader(response) {
  const allowHeader = response.headers.get("allow");
  const allowedMethods = (allowHeader || "")
    .split(",")
    .map((method) => method.trim())
    .filter(Boolean);

  expect(allowHeader).toBeDefined();
  expect(allowedMethods).toEqual(expect.arrayContaining(["GET", "POST"]));
}

// Executa a chamada com metodo HTTP nao suportado e devolve resposta + JSON.
async function fetchWithUnsupportedMethod(method) {
  const response = await fetch(API_URL, { method });
  const responseBody = await response.json();

  return { response, responseBody };
}

// Valida o contrato de erro 405 que inclui o metodo HTTP na mensagem.
function expectMethodNotAllowedErrorBody(responseBody, method) {
  expect(responseBody).toEqual({ error: `Method "${method}" not allowed` });
}

beforeEach(async () => {
  await orchestrator.clearDatabase();
});

test("POST /api/v1/migrations rejects unsupported HTTP methods with 405", async () => {
  expect.hasAssertions();

  for (const method of UNSUPPORTED_METHODS) {
    const { response, responseBody } = await fetchWithUnsupportedMethod(method);

    expectMethodNotAllowedJsonResponse(response);
    expectAllowedMethodsHeader(response);
    expectMethodNotAllowedErrorBody(responseBody, method);
  }
});
