import bcryptjs from "bcryptjs";

async function hash(password) {
  const saltRounds = getNumberOfSaltRounds();
  const hashedPassword = await bcryptjs.hash(password, saltRounds);
  return hashedPassword;
}

async function compare(providedPassword, storedPassword) {
  const isMatch = await bcryptjs.compare(providedPassword, storedPassword);
  return isMatch;
}

function getNumberOfSaltRounds() {
  let saltRounds = 1;

  if (process.env.NODE_ENV === "production") {
    saltRounds = 14;
  }

  return saltRounds;
}

export default {
  hash,
  compare,
};
