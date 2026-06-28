import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import user from "models/user.js";
import activation from "models/activation.js";
import authorization from "models/authorization";

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .post(controller.canRequestMiddleware("create:user"), postHandler)
  .handler(controller.errorHandlers);

async function postHandler(request, response) {
  const userInputValues = request.body;
  const newUser = await user.create(userInputValues);
  const newActivation = await activation.create(newUser.id);
  await activation.sendEmailToUser(newUser, newActivation);

  const secureOutputValues = authorization.filterOutput(
    request.context.user,
    "read:user",
    newUser,
  );

  return response.status(201).json(secureOutputValues);
}
