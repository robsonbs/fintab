import * as cookie from "cookie";
import session from "models/session.js";
import {
  InternalServerError,
  MethodNotAllowedError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  TooManyRequestsError,
  ForbiddenError,
} from "./errors.js";
import user from "models/user.js";
import authorization from "models/authorization.js";

function onNoMatchHandler(request, response) {
  const publicErrorObject = new MethodNotAllowedError();
  return response.status(publicErrorObject.statusCode).json(publicErrorObject);
}

function onErrorHandler(error, request, response) {
  if (
    error instanceof ValidationError ||
    error instanceof NotFoundError ||
    error instanceof ForbiddenError
  ) {
    console.log(error);
    return response.status(error.statusCode).json(error);
  }

  if (
    error instanceof UnauthorizedError ||
    error instanceof TooManyRequestsError
  ) {
    clearSessionCookie(response);
    return response.status(error.statusCode).json(error);
  }

  const publicErrorObject = new InternalServerError({
    cause: error,
    statusCode: error.statusCode,
  });
  console.error("Error occurred while handling request:", publicErrorObject);
  return response.status(publicErrorObject.statusCode).json(publicErrorObject);
}

function setSessionCookie(response, token) {
  const setCookie = cookie.serialize("session_id", token, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: session.EXPIRATION_IN_MILLISECONDS / 1000, // Convert milliseconds to seconds
  });
  response.setHeader("Set-Cookie", setCookie);
}

function clearSessionCookie(response) {
  const setCookie = cookie.serialize("session_id", "invalid", {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: -1,
  });
  response.setHeader("Set-Cookie", setCookie);
}

async function injectAnonymousOrUser(request, response, next) {
  const sessionId = request.cookies?.session_id;
  if (!sessionId) {
    injectAnonymous(request);
    return next();
  }

  await injectAuthenticatedUser(request);

  return next();
}

async function injectAuthenticatedUser(request) {
  const sessionToken = request.cookies.session_id;
  const sessionObject = await session.findOneValidByToken(sessionToken);
  const userObject = await user.findOneById(sessionObject.user_id);
  request.context = {
    ...request.context,
    user: userObject,
  };
}

function injectAnonymous(request) {
  const anonymousUserObject = {
    features: ["read:activation_token", "create:session", "create:user"],
  };

  request.context = {
    ...request.context,
    user: anonymousUserObject,
  };
}

function canRequestMiddleware(requiredFeature) {
  return (request, _, next) => {
    const userTrying = request.context?.user || { features: [] };
    if (!authorization.canPerformAction(userTrying, requiredFeature)) {
      throw new ForbiddenError({
        message: "Você não tem permissão para acessar este recurso.",
        action: `Verifique se o seu usuário possui a feature "${requiredFeature}"`,
      });
    }

    return next();
  };
}

export default {
  errorHandlers: {
    onNoMatch: onNoMatchHandler,
    onError: onErrorHandler,
  },
  setSessionCookie,
  clearSessionCookie,
  injectAnonymousOrUser,
  canRequestMiddleware,
};
