import { runMigrations } from "infra/migration";

const INTERNAL_ERROR_MESSAGE = "Error running migrations";

async function handleGet(response) {
  const migrations = await runMigrations({ dryRun: true });
  return response.status(200).json(migrations);
}

async function handlePost(response) {
  const migrations = await runMigrations({ dryRun: false });
  return response.status(migrations.length > 0 ? 201 : 200).json(migrations);
}

const METHOD_HANDLERS = {
  GET: handleGet,
  POST: handlePost,
};

export default async function migrations(request, response) {
  const method = request.method;
  const handler = METHOD_HANDLERS[method];

  if (!handler) {
    response.setHeader("Allow", Object.keys(METHOD_HANDLERS));
    return response
      .status(405)
      .json({ error: `Method "${method}" not allowed` });
  }

  try {
    return await handler(response);
  } catch (error) {
    console.error("Error running migrations:", error);
    return response.status(500).json({ error: INTERNAL_ERROR_MESSAGE });
  }
}
