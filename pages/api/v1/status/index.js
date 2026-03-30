import database from "infra/database.js";

async function status(request, response) {
  const updatedAt = new Date().toISOString();

  const databaseVersionResult = await database.query({
    text: `SELECT (SELECT COUNT(*)::int from pg_stat_activity WHERE datname = $1) as "openConnections", current_setting('max_connections')::int as "maxConnections", current_setting('server_version') as "serverVersion"`,
    values: [process.env.POSTGRES_DB],
  });

  response.status(200).json({
    updated_at: updatedAt,
    dependencies: {
      database: {
        version: databaseVersionResult.rows[0].serverVersion,
        max_connections: databaseVersionResult.rows[0].maxConnections,
        open_connections: databaseVersionResult.rows[0].openConnections,
      },
    },
  });
}

export default status;
