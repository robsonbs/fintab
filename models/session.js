import database from "infra/database.js";
import { UnauthorizedError } from "infra/errors.js";
import crypto from "node:crypto";

const EXPIRATION_IN_MILLISECONDS = 30 * 24 * 60 * 60 * 1000; // 30 days

async function findOneValidByToken(sessionToken) {
  const results = await database.query({
    text: `
      SELECT
        *
      FROM
        sessions
      WHERE
          token = $1
        AND
          expires_at > NOW()
      LIMIT
        1
      ;`,
    values: [sessionToken],
  });
  if (results.rowCount === 0) {
    throw new UnauthorizedError({
      message: "Usuário não possui sessão ativa.",
      action: "Verifique se este usuário está logado e tente novamente.",
    });
  }
  return results.rows[0];
}

async function create(userId) {
  const sessionToken = crypto.randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + EXPIRATION_IN_MILLISECONDS);

  const newSession = await runInsertQuery(sessionToken, userId, expiresAt);
  return newSession;

  async function runInsertQuery(token, userId, expiresAt) {
    const results = await database.query({
      text: `
      INSERT INTO
        sessions (token, user_id, expires_at)
      VALUES
        ($1, $2, $3)
      RETURNING
        *
      `,
      values: [token, userId, expiresAt],
    });

    return results.rows[0];
  }
}

async function renew(sessionId) {
  const newExpiresAt = new Date(Date.now() + EXPIRATION_IN_MILLISECONDS);
  const renewedSessionObject = await runUpdateQuery(sessionId, newExpiresAt);
  return renewedSessionObject;

  async function runUpdateQuery(sessionId, expiresAt) {
    const results = await database.query({
      text: `
      UPDATE
        sessions
      SET
        expires_at = $1,
        updated_at = NOW()
      WHERE
        id = $2
      RETURNING
        *
      ;`,
      values: [expiresAt, sessionId],
    });

    return results.rows[0];
  }
}

export default {
  create,
  findOneValidByToken,
  renew,
  EXPIRATION_IN_MILLISECONDS,
};
