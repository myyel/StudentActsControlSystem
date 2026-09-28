// Shared by playwright.config.ts and the specs.
export const E2E_PORT = Number(process.env.E2E_PORT ?? 3100);
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;
/** Separate database on the dev Postgres; the setup project resets and seeds it on every run. */
export const E2E_DATABASE_URL = process.env.E2E_DATABASE_URL ?? "postgres://app:app@localhost:5432/class_attitude_e2e";
