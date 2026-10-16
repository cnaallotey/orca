import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      vscode: path.resolve(__dirname, "apps/extension/src/__mocks__/vscode.ts"),
    },
  },
  css: {
    postcss: {},
  },
  test: {
    environment: "node",
    include: ["packages/*/src/**/*.test.ts", "apps/*/src/**/*.test.ts"],
    passWithNoTests: true,
  },
});
