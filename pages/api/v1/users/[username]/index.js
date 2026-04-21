import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import user from "models/user.js";
import authorization from "models/authorization";
import { ForbiddenError } from "infra/errors";

const router = createRouter();
router.use(controller.injectAnonymousOrUser);
router.get(getHandler);
router.patch(controller.canRequestMiddleware("update:user"), patchHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const { username } = request.query;
  const userFound = await user.findOneByUsername(username);
  return response.status(200).json(userFound);
}

async function patchHandler(request, response) {
  const { username } = request.query;

  const userTryingToUpdate = request.context.user;
  const targetUser = await user.findOneByUsername(username);
  if (
    !authorization.canPerformAction(
      userTryingToUpdate,
      "update:user",
      targetUser,
    )
  ) {
    throw new ForbiddenError({
      message: "Você não possui permissão para atualizar este usuário.",
      action:
        "Verifique se você possui a feature necessária para atualizar outro usuário.",
    });
  }

  const updatedUser = await user.update(username, request.body);
  return response.status(200).json(updatedUser);
}
