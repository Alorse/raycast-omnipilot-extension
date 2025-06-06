import { defineConfig } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";

export default defineConfig([
  ...raycastConfig,
  {
    rules: {
      "import/no-anonymous-default-export": ["off"],
      "no-console": ["warn", { "allow": ["error", "warn"] }], // Allow console.error and console.warn
      "no-unused-vars": ["error", { "args": "none" }]
    }
  }
]);