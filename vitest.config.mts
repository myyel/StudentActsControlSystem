import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // PGlite boots a WASM Postgres per test file; migrations take a moment.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      // Modules read these at import time; tests never use the real database.
      DATABASE_URL: "postgres://unused:unused@localhost:5432/unused",
      BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-1234",
      BETTER_AUTH_URL: "http://localhost:3000",
    },
  },
});
