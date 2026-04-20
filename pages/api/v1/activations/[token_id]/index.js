import { createRouter } from "next-connect";

import controller from "infra/controller.js";
import activation from "models/activation.js";
import { NotFoundError } from "infra/errors.js";

const router = createRouter();
router.patch(patchHandler);

export default router.handler(controller.errorHandlers);

async function patchHandler(request, response) {
  const { token_id } = request.query;

  const usedActivationToken = await activation.markTokenAsUsed(token_id);
  if (!usedActivationToken) {
    throw new NotFoundError("Activation token not found or invalid");
  }

  await activation.activateUserByUserId(usedActivationToken.user_id);

  return response.status(200).json(usedActivationToken);
}
