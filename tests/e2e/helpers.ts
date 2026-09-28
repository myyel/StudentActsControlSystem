import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type TestInfo } from "@playwright/test";
import { Client } from "pg";
import { E2E_DATABASE_URL } from "./env";

export const PASSWORD = "Sifre1234!";

/**
 * Seed accounts (src/server/db/seed.ts). veli1 has Ada Y. and Ali K. in 2-A; veli2 has Ayşe D.
 * (used and deleted by privacy.spec.ts). Sign-in is limited to 5/min: 4 here + keyboard.spec.ts.
 */
export const ACCOUNTS = {
  admin: "admin@ornek.okul",
  teacher: "ogretmen@ornek.okul",
  parent: "veli1@ornek.okul",
  parent2: "veli2@ornek.okul",
} as const;

export type Role = keyof typeof ACCOUNTS;

export function storageStatePath(role: Role) {
  return path.join(__dirname, ".auth", `${role}.json`);
}

/** Runs one read-only query against the e2e database (for ids the URLs need). */
export async function queryOne<T>(sql: string, params: unknown[] = []): Promise<T> {
  const client = new Client({ connectionString: E2E_DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query(sql, params);
    if (!rows[0]) throw new Error(`No row for: ${sql}`);
    return rows[0] as T;
  } finally {
    await client.end();
  }
}

export async function classId(name: string) {
  return (await queryOne<{ id: string }>("SELECT id FROM class WHERE name = $1", [name])).id;
}

/** Student by first name and last initial, e.g. studentId("Ada", "Y"). */
export async function studentId(firstName: string, lastInitial: string) {
  return (await queryOne<{ id: string }>("SELECT id FROM student WHERE first_name = $1 AND last_initial = $2", [firstName, lastInitial])).id;
}

/** Touch projects follow the 44px rule (80px on the board); mouse gets WCAG 2.2's 24px minimum. */
export function minTarget(testInfo: TestInfo, board = false) {
  if (board) return 80;
  return testInfo.project.use.hasTouch ? 44 : 24;
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect.soft(overflow, "page scrolls horizontally").toBeLessThanOrEqual(0);
}

/** Visible buttons, links and form controls smaller than `min` px (either side). */
export async function smallTargets(page: Page, min: number, scope = "body") {
  // Dialogs zoom in from 95%; measure the final size.
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
  return page.evaluate(
    ({ min, scope }) => {
      const selector = 'a[href], button, [role="button"], [role="switch"], [role="tab"], [role="checkbox"], [role="radio"], input:not([type="hidden"]), select, textarea, summary';
      const results: string[] = [];
      for (const el of document.querySelector(scope)?.querySelectorAll<HTMLElement>(selector) ?? []) {
        const style = getComputedStyle(el);
        if (style.visibility === "hidden" || style.display === "none") continue;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;
        // Inline links inside running text are exempt (WCAG 2.5.8 "inline" exception).
        const parentText = el.parentElement?.textContent?.trim().length ?? 0;
        if (el.tagName === "A" && style.display === "inline" && parentText > (el.textContent?.trim().length ?? 0)) continue;
        // A small control with a big enough invisible hit area (label wrapping it) passes.
        const hit = el.closest("label") ?? el;
        const hitRect = hit.getBoundingClientRect();
        if (Math.max(rect.width, hitRect.width) + 0.5 < min || Math.max(rect.height, hitRect.height) + 0.5 < min) {
          const label = (el.getAttribute("aria-label") ?? el.textContent ?? el.getAttribute("name") ?? el.tagName).trim().slice(0, 40);
          results.push(`${el.tagName.toLowerCase()} "${label}" ${Math.round(rect.width)}×${Math.round(rect.height)}`);
        }
      }
      return results;
    },
    { min, scope },
  );
}

/** axe WCAG 2 A/AA scan (contrast included); returns readable violations. */
export async function axeViolations(page: Page) {
  // Buttons animate their colors (transition-all); measure the settled colors after a theme switch.
  await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; animation: none !important; }" });
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  return violations.map((v) => `${v.id}: ${v.help}\n  ${v.nodes.slice(0, 5).map((n) => n.target.join(" ")).join("\n  ")}`);
}
