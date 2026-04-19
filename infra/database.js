import { Client } from "pg";
import { ServiceError } from "./errors.js";

async function query(queryObject) {
  let client;
  try {
    client = await getClient();
    const result = await client.query(queryObject);
    return result;
  } catch (error) {
    const serviceErrorObject = new ServiceError({
      message: "Database query failed",
      cause: error,
    });
    console.error("Database query error:", serviceErrorObject);
    throw serviceErrorObject;
  } finally {
    await client?.end();
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
    const serviceErrorObject = new ServiceError({
      message: "Database connection failed",
      cause: error,
    });
    console.error("Database connection error:", serviceErrorObject);
    if (client) {
      await client.end();
    }
    throw serviceErrorObject;
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
