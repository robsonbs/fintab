import { createRouter } from "next-connect";
import database from "infra/database.js";
import controller from "infra/controller";
import authorization from "models/authorization";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.get(getHandler);

export default router.handler(controller.errorHandlers);

// Handler principal para GET /api/v1/status. Consulta o status do banco e retorna em formato JSON.
async function getHandler(request, response) {
  const updatedAt = new Date().toISOString();
  const appEnv = process.env.APP_ENV || process.env.NODE_ENV || "unknown";

  const databaseVersionResult = await database.query({
    text: `SELECT
    current_setting('server_version') as "version",
    current_setting('max_connections')::int as "max_connections",
    (SELECT COUNT(*)::int from pg_stat_activity WHERE datname = $1) as "open_connections"`,
    values: [process.env.POSTGRES_DB],
  });

  const statusObject = {
    updated_at: updatedAt,
    dependencies: {
      database: {
        environment: appEnv,
        ...databaseVersionResult.rows[0],
      },
    },
  };

  const secureOutputValues = authorization.filterOutput(
    request.context?.user,
    "read:status",
    statusObject,
  );

  response.status(200).json(secureOutputValues);
}
