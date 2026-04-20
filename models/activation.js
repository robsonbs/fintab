import email from "infra/email.js";
import database from "infra/database.js";
import webserver from "infra/webserver.js";

const EXPIRATION_TIME_MINUTES = 15 * 60 * 1000; // 15 minutos em milissegundos

async function findOneValidById(id) {
  const query = {
    text: `
      SELECT
        *
      FROM
        user_activation_tokens
      WHERE
        id = $1
        AND used_at IS NULL
        AND expires_at > timezone('utc', now())
      ORDER BY
        created_at DESC
      LIMIT 1
    ;`,
    values: [id],
  };

  const { rows } = await database.query(query);
  return rows[0];
}

async function create(userId) {
  const expiresAt = new Date(Date.now() + EXPIRATION_TIME_MINUTES);

  const newToken = await runInsertQuery(userId, expiresAt);
  return newToken;

  async function runInsertQuery(userId, expiresAt) {
    const insertQuery = {
      text: `
        INSERT INTO
          user_activation_tokens (user_id, expires_at)
        VALUES
          ($1, $2)
        RETURNING
          *
      ;`,
      values: [userId, expiresAt],
    };

    const { rows } = await database.query(insertQuery);
    return rows[0];
  }
}

async function sendEmailToUser(user, activationToken) {
  await email.send({
    from: "Robson Souza Dev <contato@robsonsouza.dev.br>",
    to: user.email,
    subject: "Ative seu cadastro no Robson Souza Dev!",
    text: [
      `Olá, ${user.username}! Por favor, ative seu cadastro clicando no link abaixo:\n`,
      `${webserver.origin}/singup/activate/${activationToken.id}\n`,
      `Obrigado por se cadastrar!\n`,
      `Atenciosamente,\nEquipe Robson Souza Dev`,
    ].join("\n"),
  });
}

export default { create, sendEmailToUser, findOneValidById };
