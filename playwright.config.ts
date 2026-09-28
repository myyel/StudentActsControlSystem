import { defineConfig, devices } from "@playwright/test";
import { E2E_BASE_URL, E2E_DATABASE_URL, E2E_PORT } from "./tests/e2e/env";

// The e2e suite runs a production build against its own database (reset + seeded by the setup
// project), so it needs Postgres: `docker compose up -d db`.
export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: E2E_BASE_URL,
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /global\.setup\.ts/ },
    // PRD §2 breakpoints: phone, tablet, desktop and the touch-screen classroom board.
    {
      name: "mobile",
      dependencies: ["setup"],
      testIgnore: /(keyboard|privacy)\.spec\.ts/, // desktop only: keyboard checks, data deletion
      use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    },
    {
      name: "tablet",
      dependencies: ["setup"],
      testIgnore: /(keyboard|privacy)\.spec\.ts/, // desktop only: keyboard checks, data deletion
      use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 }, hasTouch: true },
    },
    {
      name: "desktop",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "board",
      dependencies: ["setup"],
      testIgnore: /(keyboard|privacy)\.spec\.ts/, // desktop only: keyboard checks, data deletion
      use: { ...devices["Desktop Chrome"], viewport: { width: 1920, height: 1080 }, hasTouch: true },
    },
  ],
  webServer: {
    command: "pnpm build && node tests/e2e/start-server.mjs",
    url: `${E2E_BASE_URL}/giris`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    stdout: "ignore",
    stderr: "pipe",
    env: {
      NEXT_DIST_DIR: ".next-e2e",
      PORT: String(E2E_PORT),
      HOSTNAME: "localhost",
      DATABASE_URL: E2E_DATABASE_URL,
      BETTER_AUTH_URL: E2E_BASE_URL,
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "e2e-secret-e2e-secret-e2e-secret-123456",
      // Push stays off in e2e; in-app notifications still work.
      VAPID_PUBLIC_KEY: "",
      VAPID_PRIVATE_KEY: "",
    },
  },
});
