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

// Executa a chamada com metodo HTTP nao suportado e devolve resposta + JSON.
async function fetchWithUnsupportedMethod(method) {
  const response = await fetch(API_URL, { method });
  const responseBody = await response.json();

  return { response, responseBody };
}

// Valida o contrato de erro 405 que inclui o metodo HTTP na mensagem.
function expectMethodNotAllowedErrorBody(responseBody) {
  expect(responseBody).toEqual({
    action:
      "Verifique se o método HTTP utilizado é suportado por este endpoint e tente novamente.",
    message: "Método não permitido para este endpoint.",
    name: "MethodNotAllowedError",
    status_code: 405,
  });
}

beforeEach(async () => {
  await orchestrator.clearDatabase();
});
describe("Others methods /api/v1/migrations", () => {
  describe("Anonymous user", () => {
    test("rejects unsupported HTTP methods with 405", async () => {
      expect.hasAssertions();

      for (const method of UNSUPPORTED_METHODS) {
        const { response, responseBody } =
          await fetchWithUnsupportedMethod(method);

        expectMethodNotAllowedJsonResponse(response);
        expectMethodNotAllowedErrorBody(responseBody);
      }
    });
  });
});
