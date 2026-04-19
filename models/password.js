import bcryptjs from "bcryptjs";

let timingSafePlaceholderHashPromise;
const MIN_SALT_ROUNDS = 10;
const MAX_SALT_ROUNDS = 16;
const DEFAULT_NON_PRODUCTION_SALT_ROUNDS = 1;
const DEFAULT_PRODUCTION_SALT_ROUNDS = 14;

async function hash(password) {
  const saltRounds = getNumberOfSaltRounds();
  const hashedPassword = await bcryptjs.hash(
    process.env.PASSWORD_SECRET_PEPPER + password,
    saltRounds,
  );
  return hashedPassword;
}

async function compare(providedPassword, storedPassword) {
  const isMatch = await bcryptjs.compare(
    process.env.PASSWORD_SECRET_PEPPER + providedPassword,
    storedPassword,
  );
  return isMatch;
}

async function getTimingSafePlaceholderHash() {
  if (!timingSafePlaceholderHashPromise) {
    timingSafePlaceholderHashPromise = bcryptjs.hash(
      process.env.PASSWORD_SECRET_PEPPER + "timing-safe-placeholder-password",
      getNumberOfSaltRounds(),
    );
  }

  return await timingSafePlaceholderHashPromise;
}

function getNumberOfSaltRounds() {
  const envSaltRounds = Number.parseInt(
    process.env.BCRYPT_SALT_ROUNDS || "",
    10,
  );

  if (
    Number.isInteger(envSaltRounds) &&
    envSaltRounds >= MIN_SALT_ROUNDS &&
    envSaltRounds <= MAX_SALT_ROUNDS
  ) {
    return envSaltRounds;
  }

  if (process.env.NODE_ENV === "production") {
    return DEFAULT_PRODUCTION_SALT_ROUNDS;
  }

  return DEFAULT_NON_PRODUCTION_SALT_ROUNDS;
}

export default {
  hash,
  compare,
  getTimingSafePlaceholderHash,
};
