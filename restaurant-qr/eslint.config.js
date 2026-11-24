import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import ts from "typescript-eslint";
import hook from "eslint-plugin-react-hooks";

export default defineConfig([
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "test-results/**",
      "playwright-report/**",
    ],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...ts.configs.recommended],
    plugins: { "react-hooks": hook },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
]);
