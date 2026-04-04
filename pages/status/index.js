import useSWR from "swr";

async function fetchAPI(key) {
  const response = await fetch(key);
  const responseBody = await response.json();

  return responseBody;
}

function UpdatedAt() {
  const { isLoading, data } = useSWR("/api/v1/status", fetchAPI, {
    refreshInterval: 2000, // Atualiza o status a cada 2 segundos para refletir mudanças em tempo real.
  });

  let updatedAtText = "Loading...";
  if (!isLoading && data) {
    updatedAtText = new Date(data.updated_at).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium",
    });
  }
  return <div>Última atualização: {updatedAtText}</div>;
}

function DatabaseStatus() {
  const { isLoading, data } = useSWR("/api/v1/status", fetchAPI, {
    refreshInterval: 2000,
  });

  if (isLoading) {
    return <div>Carregando status do banco de dados...</div>;
  }

  if (!data) {
    return <div>Falha ao carregar status do banco de dados.</div>;
  }

  const { database } = data.dependencies;

  return (
    <div>
      <h2>Status do Banco de Dados</h2>
      <p>Ambiente: {database.environment}</p>
      <p>Versão: {database.version}</p>
      <p>
        Conexões Abertas: {database.open_connections} /{" "}
        {database.max_connections}
      </p>
    </div>
  );
}

export default function StatusPage() {
  return (
    <>
      <h1>Status</h1>
      <UpdatedAt />
      <DatabaseStatus />
    </>
  );
}
