import database from "infra/database.js";
import password from "models/password.js";
import { ValidationError, NotFoundError } from "infra/errors.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function create(userInputValues) {
  const { username, email } = userInputValues;
  await validateUniqueUsername(username);
  await validateUniqueEmail(email);
  await validateAndHashPassword(userInputValues);
  injectDefaultFeaturesInObject(userInputValues);
  const newUser = await runInsertQuery(userInputValues);
  return newUser;

  function injectDefaultFeaturesInObject(userInputValues) {
    userInputValues.features = ["read:activation_token"];
  }
}

async function update(username, userInputValues) {
  validatePayload(userInputValues);

  const currentUser = await findOneByUsername(username);

  if ("username" in userInputValues) {
    await validateUsername(userInputValues.username, currentUser.username);
  }

  if ("email" in userInputValues) {
    await validateEmail(userInputValues.email);
  }

  if ("password" in userInputValues) {
    await validateAndHashPassword(userInputValues);
  }

  const userWithUpdates = { ...currentUser, ...userInputValues };
  return await runUpdateQuery(userWithUpdates);
}

function validatePayload(userInputValues) {
  if (Object.keys(userInputValues).length === 0) {
    throw new ValidationError({
      message: "O payload não pode estar vazio.",
      action: "Envie pelo menos um campo válido para atualizar.",
    });
  }

  const allowedFields = ["username", "email", "password"];
  const unexpectedFields = Object.keys(userInputValues).filter(
    (field) => !allowedFields.includes(field),
  );

  if (unexpectedFields.length > 0) {
    throw new ValidationError({
      message: `O payload contém campos inesperados: ${unexpectedFields.join(", ")}.`,
      action: "Remova os campos inválidos e tente novamente.",
    });
  }
}

async function validateUsername(newUsername, currentUsername) {
  if (newUsername == null) {
    // Checks for both null and undefined
    throw new ValidationError({
      message: "O username não pode ser nulo ou indefinido.",
      action: "Informe um username válido.",
    });
  }

  if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
    throw new ValidationError({
      message: "O username contém caracteres inválidos.",
      action:
        "Informe um username válido contendo apenas letras, números, sublinhados ou traços.",
    });
  }

  if (currentUsername.toLowerCase() !== newUsername.toLowerCase()) {
    await validateUniqueUsername(newUsername);
  }
}

async function validateEmail(email) {
  if (email == null) {
    // Checks for both null and undefined
    throw new ValidationError({
      message: "O email não pode ser nulo ou indefinido.",
      action: "Informe um email válido.",
    });
  }

  if (!emailRegex.test(email)) {
    throw new ValidationError({
      message: "O email informado possui um formato inválido.",
      action:
        "Informe um email válido no formato correto (ex.: usuario@dominio.com).",
    });
  }

  await validateUniqueEmail(email);
}

async function validateAndHashPassword(userInputValues) {
  if (userInputValues.password == null) {
    // Checks for both null and undefined
    throw new ValidationError({
      message: "A senha não pode ser nula.",
      action: "Informe uma senha válida.",
    });
  }
  validatePassword(userInputValues.password);
  await hashPasswordInObject(userInputValues);
}

async function hashPasswordInObject(userInputValues) {
  const hashedPassword = await password.hash(userInputValues.password);
  userInputValues.password = hashedPassword;
}

async function runInsertQuery(userInputValues) {
  const { username, email, password, features } = userInputValues;

  const results = await database.query({
    text: `
    INSERT INTO users
      (username, email, password, features)
     VALUES
      ($1, $2, $3, $4)
     RETURNING *;
     `,
    values: [username, email.toLowerCase(), password, features],
  });
  return results.rows[0];
}

async function runUpdateQuery(userWithNewValues) {
  const results = await database.query({
    text: `
    UPDATE users
    SET
      username = COALESCE($1, username),
      email = COALESCE(LOWER($2), email),
      password = COALESCE($3, password),
      updated_at = timezone('utc', now())
    WHERE
      id = $4
    RETURNING *;
    `,
    values: [
      userWithNewValues.username,
      userWithNewValues.email,
      userWithNewValues.password,
      userWithNewValues.id,
    ],
  });
  return results.rows[0];
}

async function validateUniqueUsername(username) {
  const results = await database.query({
    text: "SELECT * FROM users WHERE LOWER(username) = LOWER($1);",
    values: [username],
  });
  if (results.rowCount > 0) {
    throw new ValidationError({
      message: `O username informado já está sendo utilizado.`,
      action: "Utilize outro username para realizar esta operação.",
    });
  }
}

async function validateUniqueEmail(email) {
  const results = await database.query({
    text: "SELECT * FROM users WHERE LOWER(email) = LOWER($1);",
    values: [email],
  });
  if (results.rowCount > 0) {
    throw new ValidationError({
      message: `O email informado já está sendo utilizado.`,
      action: "Utilize outro email para realizar esta operação.",
    });
  }
}

async function findOneByUsername(username) {
  const userFound = await runSelectQuery(username);
  return userFound;
}

async function findOneByEmail(email) {
  const userFound = await runSelectQuery(email, "email");
  return userFound;
}

async function findOneById(id) {
  const userFound = await runSelectQuery(id, "id");
  return userFound;

  async function runSelectQuery(subject, field = "username") {
    const results = await database.query({
      text: `
    SELECT
      *
    FROM
      users
    WHERE
      ${field} = $1
    LIMIT
      1
    ;`,
      values: [subject],
    });
    if (results.rowCount === 0) {
      throw new NotFoundError({
        message: `O ${field} informado não foi encontrado no sistema.`,
        action: `Verifique se o ${field} foi digitado corretamente.`,
      });
    }
    return results.rows[0];
  }
}

async function runSelectQuery(subject, field = "username") {
  const results = await database.query({
    text: `
    SELECT
      *
    FROM
      users
    WHERE
      LOWER(${field}) = LOWER($1)
    LIMIT
      1
    ;`,
    values: [subject],
  });
  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: `O ${field} informado não foi encontrado no sistema.`,
      action: `Verifique se o ${field} foi digitado corretamente.`,
    });
  }
  return results.rows[0];
}

function validatePassword(password) {
  if (password.length < 8) {
    throw new ValidationError({
      message: "A senha deve ter pelo menos 8 caracteres.",
      action: "Informe uma senha válida com 8 ou mais caracteres.",
    });
  }
}

export default {
  create,
  findOneByUsername,
  findOneByEmail,
  findOneById,
  update,
};
