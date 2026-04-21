import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import {
  TooManyRequestsError,
  UnauthorizedError,
  ForbiddenError,
} from "infra/errors.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import session from "models/session.js";

const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_RATE_LIMIT_MAX_ATTEMPTS =
  process.env.NODE_ENV === "test" ? 1000 : 5;
const LOGIN_RATE_LIMIT_MAX_KEYS = 10_000;
const UNAUTHORIZED_JITTER_MIN_MS = 200;
const UNAUTHORIZED_JITTER_MAX_MS = 400;
const TRUST_PROXY_HEADER = process.env.TRUST_PROXY === "true";

const failedAttemptsByKey = new Map();

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.post(controller.canRequestMiddleware("create:session"), postHandler);
router.delete(controller.canRequestMiddleware("read:session"), deleteHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(request, response) {
  const rateLimitKey = getRateLimitKey(request);
  assertAllowedLoginAttempt(rateLimitKey);

  const userInputValues = request.body;

  try {
    const authenticateUser = await authentication.getAuthenticatedUser(
      userInputValues.email,
      userInputValues.password,
    );

    if (
      !authorization.canPerformAction(
        authenticateUser.features,
        "create:session",
      )
    ) {
      throw new ForbiddenError({
        message: "Você não tem permissão para criar uma sessão",
        action:
          "Verifique se seu usuário tem a feature necessária para realizar essa ação.",
      });
    }

    clearFailedAttempts(rateLimitKey);

    const newSession = await session.create(authenticateUser.id);

    controller.setSessionCookie(response, newSession.token);

    return response.status(201).json(newSession);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      registerFailedAttempt(rateLimitKey);
      await applyUnauthorizedJitter();
    }

    if (error instanceof TooManyRequestsError) {
      await applyUnauthorizedJitter();
    }

    throw error;
  }
}

function getRateLimitKey(request) {
  const clientIp = getClientIp(request);
  const email = getEmailForRateLimit(request.body?.email);
  return `${clientIp}:${email}`;
}

function getClientIp(request) {
  if (TRUST_PROXY_HEADER) {
    const forwardedFor = request.headers["x-forwarded-for"];
    const forwardedIp = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor?.split(",")[0]?.trim();

    if (forwardedIp) {
      return forwardedIp;
    }
  }

  return request.socket?.remoteAddress || "unknown-ip";
}

function getEmailForRateLimit(email) {
  if (typeof email !== "string") {
    return "unknown-email";
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedEmail.length === 0) {
    return "unknown-email";
  }

  return normalizedEmail;
}

function assertAllowedLoginAttempt(rateLimitKey) {
  const now = Date.now();
  pruneStaleRateLimitKeys(now);
  const attempts = getRecentAttempts(rateLimitKey, now);

  if (attempts.length >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
    throw new TooManyRequestsError({
      message:
        "Muitas tentativas de login para este email. Tente novamente mais tarde.",
      action:
        "Aguarde alguns minutos antes de tentar novamente com este email.",
    });
  }
}

function registerFailedAttempt(rateLimitKey) {
  const now = Date.now();
  pruneStaleRateLimitKeys(now);
  const attempts = getRecentAttempts(rateLimitKey, now);
  attempts.push(now);

  while (attempts.length > LOGIN_RATE_LIMIT_MAX_ATTEMPTS + 2) {
    attempts.shift();
  }

  ensureRateLimitCapacity(rateLimitKey);
  failedAttemptsByKey.set(rateLimitKey, attempts);
}

function clearFailedAttempts(rateLimitKey) {
  failedAttemptsByKey.delete(rateLimitKey);
}

function getRecentAttempts(rateLimitKey, now) {
  const attempts = failedAttemptsByKey.get(rateLimitKey) || [];
  const recentAttempts = attempts.filter(
    (timestamp) => now - timestamp <= LOGIN_RATE_LIMIT_WINDOW_MS,
  );

  if (recentAttempts.length > 0) {
    failedAttemptsByKey.set(rateLimitKey, recentAttempts);
  } else {
    failedAttemptsByKey.delete(rateLimitKey);
  }

  return recentAttempts;
}

function pruneStaleRateLimitKeys(now) {
  for (const [key, attempts] of failedAttemptsByKey.entries()) {
    const hasRecentAttempt = attempts.some(
      (timestamp) => now - timestamp <= LOGIN_RATE_LIMIT_WINDOW_MS,
    );

    if (!hasRecentAttempt) {
      failedAttemptsByKey.delete(key);
    }
  }
}

function ensureRateLimitCapacity(rateLimitKey) {
  if (failedAttemptsByKey.has(rateLimitKey)) {
    return;
  }

  if (failedAttemptsByKey.size < LOGIN_RATE_LIMIT_MAX_KEYS) {
    return;
  }

  const oldestKey = failedAttemptsByKey.keys().next().value;

  if (oldestKey) {
    failedAttemptsByKey.delete(oldestKey);
  }
}

async function applyUnauthorizedJitter() {
  const jitterRange = UNAUTHORIZED_JITTER_MAX_MS - UNAUTHORIZED_JITTER_MIN_MS;
  const jitterMs = UNAUTHORIZED_JITTER_MIN_MS + Math.random() * jitterRange;

  await new Promise((resolve) => {
    setTimeout(resolve, jitterMs);
  });
}

async function deleteHandler(request, response) {
  const sessionToken = request.cookies.session_id;

  const sessionObject = await session.findOneValidByToken(sessionToken);
  const expiredSession = await session.expireById(sessionObject.id);
  controller.clearSessionCookie(response);

  return response.status(200).json(expiredSession);
}
