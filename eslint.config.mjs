import { defineConfig } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";
import reactHooks from "eslint-plugin-react-hooks";

export default defineConfig([
  ...raycastConfig,
  {
    plugins: {
      "react-hooks": reactHooks
    },
    rules: {
      "import/no-anonymous-default-export": ["off"],
      "no-console": ["warn", { "allow": ["error", "warn"] }], // Allow console.error and console.warn
      "no-unused-vars": ["error", { "args": "none" }],
      "react-hooks/exhaustive-deps": "warn"
    }
  }
]);