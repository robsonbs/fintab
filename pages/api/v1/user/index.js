import controller from "infra/controller.js";
import authorization from "models/authorization";
import session from "models/session.js";
import user from "models/user";
import { createRouter } from "next-connect";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.get(controller.canRequestMiddleware("read:session"), getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const sessionToken = request.cookies.session_id;

  const sessionObject = await session.findOneValidByToken(sessionToken);
  await session.renew(sessionObject.id);
  const userObject = await user.findOneById(sessionObject.user_id);
  controller.setSessionCookie(response, sessionObject.token);

  response.setHeader(
    "Cache-Control",
    "no-store, no-cache, max-age=0, must-revalidate",
  );

  const secureOutputValues = authorization.filterOutput(
    request.context.user,
    "read:user:self",
    userObject,
  );

  return response.status(200).json(secureOutputValues);
}
