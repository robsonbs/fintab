import { createRouter } from "next-connect";
import { runMigrations } from "infra/migration";
import { InternalServerError, MethodNotAllowedError } from "infra/errors";

const router = createRouter();

router.get(handleGet);
router.post(handlePost);

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

async function handleGet(_, response) {
  const migrations = await runMigrations({ dryRun: true });
  return response.status(200).json(migrations);
}

async function handlePost(_, response) {
  const migrations = await runMigrations({ dryRun: false });
  return response.status(migrations.length > 0 ? 201 : 200).json(migrations);
}
