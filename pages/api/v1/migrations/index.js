import { createRouter } from "next-connect";
import migrator from "models/migrator.js";
import controller from "infra/controller.js";
import authorization from "models/authorization";
const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.get(controller.canRequestMiddleware("read:migration"), getHandler);
router.post(controller.canRequestMiddleware("create:migration"), postHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const userTryingToGet = request.context.user;
  const pendingMigrations = await migrator.listPendingMigrations();

  const secureOutputValues = authorization.filterOutput(
    userTryingToGet,
    "read:migration",
    pendingMigrations,
  );

  return response.status(200).json(secureOutputValues);
}

async function postHandler(request, response) {
  const userTryingToCreate = request.context.user;
  const migratedMigrations = await migrator.runPendingMigrations();
  const secureOutputValues = authorization.filterOutput(
    userTryingToCreate,
    "read:migration",
    migratedMigrations,
  );

  return response
    .status(secureOutputValues.length > 0 ? 201 : 200)
    .json(secureOutputValues);
}
