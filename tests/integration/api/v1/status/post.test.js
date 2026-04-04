import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  // Aguarda os servicos antes de iniciar os cenarios de integracao.
  await orchestrator.waitForAllServices();
});

const STATUS_API_URL = "http://localhost:3000/api/v1/status";

// Busca o endpoint de status e retorna resposta + corpo JSON.
async function fetchStatus() {
  const response = await fetch(STATUS_API_URL, {
    method: "POST",
  });
  const responseBody = await response.json();

  return { response, responseBody };
}

describe("POST /api/v1/status", () => {
  describe("Anonymous user", () => {
    test("returns status with content-type JSON", async () => {
      const { response, responseBody } = await fetchStatus();

      expect(response.status).toBe(405);
      expect(responseBody).toEqual({
        name: "MethodNotAllowedError",
        message: "Método não permitido para este endpoint.",
        action:
          "Verifique se o método HTTP utilizado é suportado por este endpoint e tente novamente.",
        status_code: 405,
      });
    });
  });
});
