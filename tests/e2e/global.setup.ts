import { execFileSync } from "node:child_process";
import { expect, test as setup } from "@playwright/test";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
import { E2E_DATABASE_URL } from "./env";
import { ACCOUNTS, PASSWORD, storageStatePath } from "./helpers";

setup.describe.configure({ mode: "serial" });

setup("reset and seed the e2e database", async () => {
  setup.setTimeout(120_000);
  const url = new URL(E2E_DATABASE_URL);
  const name = url.pathname.slice(1);

  const admin = new Client({ connectionString: Object.assign(new URL(url), { pathname: "/postgres" }).toString() });
  await admin.connect();
  try {
    const { rowCount } = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
    if (!rowCount) await admin.query(`CREATE DATABASE "${name.replace(/"/g, '""')}"`);
  } finally {
    await admin.end();
  }

  const client = new Client({ connectionString: E2E_DATABASE_URL });
  await client.connect();
  try {
    await migrate(drizzle({ client }), { migrationsFolder: "drizzle" });
  } finally {
    await client.end();
  }

  // --reset also empties the rate-limit table, so repeated runs can sign in again.
  execFileSync(process.execPath, ["--import", "tsx", "src/server/db/seed.ts", "--reset"], {
    env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL, NODE_ENV: "development" },
    stdio: "ignore",
  });
});

// Sign-in is rate limited (5/min in production builds): each role signs in once here and the
// specs reuse the saved session.
for (const [role, email] of Object.entries(ACCOUNTS)) {
  setup(`sign in as ${role}`, async ({ page }) => {
    await page.goto("/giris");
    await page.getByLabel("E-posta").fill(email);
    await page.getByLabel("Şifre").fill(PASSWORD);
    await page.getByRole("button", { name: "Giriş yap" }).click();
    await expect(page).not.toHaveURL(/\/giris/);
    await page.context().storageState({ path: storageStatePath(role as keyof typeof ACCOUNTS) });
  });
}
