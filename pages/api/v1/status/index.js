import database from "infra/database.js";

async function status(request, response) {
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

export default status;
