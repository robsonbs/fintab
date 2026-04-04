import { createRouter } from "next-connect";
import { runMigrations } from "infra/migration";
import controller from "infra/controller";
const router = createRouter();

router.get(handleGet);
router.post(handlePost);

export default router.handler(controller.errorHandlers);

async function handleGet(_, response) {
  const migrations = await runMigrations({ dryRun: true });
  return response.status(200).json(migrations);
}

async function handlePost(_, response) {
  const migrations = await runMigrations({ dryRun: false });
  return response.status(migrations.length > 0 ? 201 : 200).json(migrations);
}
