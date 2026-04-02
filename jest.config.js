const dotenv = require("dotenv");
dotenv.config({
  path: ".env.development",
});

const nextJexst = require("next/jest");
const createJestConfig = nextJexst({
  dir: ".",
});

const jestConfig = createJestConfig({
  moduleDirectories: ["node_modules", "<rootDir>"],
  testTimeout: 60000,
});

module.exports = jestConfig;
