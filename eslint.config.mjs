import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  ...compat.extends(
    "eslint:recommended",
    "plugin:jest/recommended",
    "next/core-web-vitals",
    "prettier",
  ),
  {
    languageOptions: {
      globals: {
        Promise: true,
      },
    },

    rules: {
      "prefer-const": ["error"],
      "no-const-assign": ["error"],
      "no-var": ["error"],
      "no-duplicate-imports": ["error"],
      "no-unreachable-loop": ["error"],
      "block-scoped-var": ["error"],
      "max-depth": ["error", 3],
      "no-else-return": ["error"],
      "no-invalid-this": ["error"],
      "no-labels": ["error"],
      "no-lonely-if": ["error"],
      "no-loop-func": ["error"],
      "no-return-assign": ["error"],
      "no-sequences": ["error"],
      "no-undef-init": ["error"],
      "no-undefined": ["error"],
      "no-unneeded-ternary": ["error"],
      "no-unused-expressions": ["error"],
      "no-useless-return": ["error"],
      "no-void": ["error"],
      yoda: ["error"],
      "import/no-anonymous-default-export": 0,
      complexity: ["error", 10],
    },
  },
  {
    files: ["tests/**/*"],

    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
  {
    ignores: [".next/*"],
  },
];
