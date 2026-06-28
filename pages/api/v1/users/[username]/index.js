import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import user from "models/user.js";
import authorization from "models/authorization";
import { ForbiddenError } from "infra/errors";

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .get(getHandler)
  .patch(controller.canRequestMiddleware("update:user"), patchHandler)
  .handler(controller.errorHandlers);

async function getHandler(request, response) {
  const { username } = request.query;
  const userTryingToUpdate = request.context.user;
  const userFound = await user.findOneByUsername(username);

  const secureOutputValues = authorization.filterOutput(
    userTryingToUpdate,
    "read:user",
    userFound,
  );

  return response.status(200).json(secureOutputValues);
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

  const secureOutputValues = authorization.filterOutput(
    userTryingToUpdate,
    "read:user",
    updatedUser,
  );

  return response.status(200).json(secureOutputValues);
}
