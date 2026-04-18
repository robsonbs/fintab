import { NotFoundError, UnauthorizedError } from "infra/errors.js";
import password from "./password.js";
import user from "./user.js";

async function getAuthenticatedUser(providedEmail, providedPassword) {
  try {
    const normalizedEmail = getNormalizedEmail(providedEmail);
    const normalizedPassword = getNormalizedPassword(providedPassword);

    if (!normalizedEmail || !normalizedPassword) {
      const placeholderHash = await password.getTimingSafePlaceholderHash();
      await validatePassword(
        normalizedPassword || "invalid-password-placeholder",
        placeholderHash,
      );
    }

    let storedUser;
    try {
      storedUser = await findUserByEmail(normalizedEmail);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        const placeholderHash = await password.getTimingSafePlaceholderHash();
        await validatePassword(normalizedPassword, placeholderHash);
      }

      throw error;
    }
    await validatePassword(normalizedPassword, storedUser.password);

    return storedUser;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw new UnauthorizedError({
        message: "Dados de autenticação não conferem.",
        action: "Verifique se o email e a senha estão corretos.",
      });
    }

    throw error; // Re-throw other errors
  }
}

function getNormalizedEmail(providedEmail) {
  if (typeof providedEmail !== "string") {
    return null;
  }

  const normalizedEmail = providedEmail.trim();

  if (normalizedEmail.length === 0) {
    return null;
  }

  return normalizedEmail;
}

function getNormalizedPassword(providedPassword) {
  if (typeof providedPassword !== "string") {
    return null;
  }

  if (providedPassword.length === 0) {
    return null;
  }

  return providedPassword;
}

async function findUserByEmail(providedEmail) {
  let storedUser;

  try {
    storedUser = await user.findOneByEmail(providedEmail);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw new UnauthorizedError({
        message: "Email não confere.",
        action: "Verifique se este dado está correto.",
      });
    }

    throw error;
  }
  return storedUser;
}

async function validatePassword(providedPassword, storedPassword) {
  const correctPasswordMatch = await password.compare(
    providedPassword,
    storedPassword,
  );

  if (!correctPasswordMatch) {
    throw new UnauthorizedError({
      message: "Senha não confere.",
      action: "Verifique se este dado está correto.",
    });
  }
}

export default {
  getAuthenticatedUser,
};
