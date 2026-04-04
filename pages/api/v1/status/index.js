import { createRouter } from "next-connect";
import database from "infra/database.js";
import { InternalServerError, MethodNotAllowedError } from "infra/errors";

const router = createRouter();

router.get(getHandler);

export default router.handler({
  onNoMatch: onNoMatchHandler,
  onError: onErrorHandler,
});

function onNoMatchHandler(request, response) {
  const publicErrorObject = new MethodNotAllowedError();
  response.status(publicErrorObject.statusCode).json(publicErrorObject);
}

function onErrorHandler(error, request, response) {
  const publicErrorObject = new InternalServerError({
    cause: error,
  });
  console.error("Error occurred while handling request:", publicErrorObject);
  response.status(publicErrorObject.statusCode).json(publicErrorObject);
}

// Handler principal para GET /api/v1/status. Consulta o status do banco e retorna em formato JSON.

async function getHandler(_, response) {
  const updatedAt = new Date().toISOString();
  const appEnv = process.env.APP_ENV || process.env.NODE_ENV || "unknown";

  const databaseVersionResult = await database.query({
    text: `SELECT
    current_setting('server_version') as "version",
    current_setting('max_connections')::int as "max_connections",
    (SELECT COUNT(*)::int from pg_stat_activity WHERE datname = $1) as "open_connections"`,
    values: [process.env.POSTGRES_DB],
  });

  response.status(200).json({
    updated_at: updatedAt,
    dependencies: {
      database: {
        environment: appEnv,
        ...databaseVersionResult.rows[0],
      },
    },
  });
}
