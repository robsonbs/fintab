import { Client } from "pg";

async function query(queryObject) {
  let client;
  try {
    client = await getClient();
    const result = await client.query(queryObject);
    return result;
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  } finally {
    await client.end();
  }
}

async function getClient() {
  let client;

  try {
    client = new Client({
      host: process.env.POSTGRES_HOST,
      port: process.env.POSTGRES_PORT,
      user: process.env.POSTGRES_USER,
      database: process.env.POSTGRES_DB,
      password: process.env.POSTGRES_PASSWORD,
      ssl: getSSLValues(),
    });

    await client.connect();
    return client;
  } catch (error) {
    console.error("Database connection error:", error);
    if (client) {
      await client.end();
    }
    throw error;
  }
}
export default {
  query,
  getClient,
};

function getSSLValues() {
  if (process.env.POSTGRES_CA) {
    return {
      ca: process.env.POSTGRES_CA,
    };
  }

  return process.env.NODE_ENV === "production";
}
