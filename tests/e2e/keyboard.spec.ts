import { expect, test, type Page } from "@playwright/test";
import { classId, PASSWORD, storageStatePath } from "./helpers";

// Runs in the desktop project only (playwright.config.ts): keyboard use is a desktop concern,
// and one run keeps sign-ins under the rate limit.

/** The focused element draws a visible indicator (outline or focus ring shadow). */
async function expectVisibleFocus(page: Page) {
  const indicator = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;
    const style = getComputedStyle(el);
    return { outline: style.outlineStyle !== "none" && style.outlineWidth !== "0px", ring: style.boxShadow !== "none" };
  });
  expect(indicator, "an element has focus").not.toBeNull();
  expect(indicator!.outline || indicator!.ring, "focus is visible").toBe(true);
}

test("signs in with the keyboard only", async ({ page }) => {
  await page.goto("/giris");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("E-posta")).toBeFocused();
  await expectVisibleFocus(page);
  await page.keyboard.type("veli2@ornek.okul");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Şifre")).toBeFocused();
  await page.keyboard.type(PASSWORD);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Giriş yap" })).toBeFocused();
  await expectVisibleFocus(page);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/veli/);
});

test.describe("teacher", () => {
  test.use({ storageState: storageStatePath("teacher") });

  test("behavior dialog traps focus and Escape returns it to the card", async ({ page }) => {
    await page.goto(`/ogretmen/siniflar/${await classId("2-A")}`);
    const card = page.getByRole("button", { name: /^Ada Y\./ });
    await card.focus();
    await expectVisibleFocus(page);
    await page.keyboard.press("Enter");

    const dialog = page.getByRole("dialog", { name: "Ada Y." });
    await expect(dialog).toBeVisible();
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press("Tab");
      expect(await dialog.evaluate((d) => d.contains(document.activeElement)), "focus stays in the dialog").toBe(true);
    }
    await expectVisibleFocus(page);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(card).toBeFocused();
  });

  test("reorders subjects with the keyboard", async ({ page }) => {
    await page.goto(`/ogretmen/siniflar/${await classId("2-A")}/duraklar`);
    const handle = (subject: string) => page.getByRole("button", { name: `${subject}: sürükleyerek sırala`, exact: true });
    // Topic and stage handles are nested in the same page; compare the subject handles only.
    const order = async () => {
      const labels = await page.getByRole("button", { name: /: sürükleyerek sırala$/ }).evaluateAll((els) =>
        els.map((el) => el.getAttribute("aria-label")!.replace(": sürükleyerek sırala", "")),
      );
      return labels.filter((l) => ["Türkçe", "Matematik", "Hayat Bilgisi"].includes(l));
    };
    await expect.poll(order).toEqual(["Türkçe", "Matematik", "Hayat Bilgisi"]);

    // dnd-kit measures positions after pickup, so each key waits for the drag state and the
    // screen reader announcement of the new position.
    const move = async (subject: string, key: "ArrowDown" | "ArrowUp", to: number) => {
      await handle(subject).focus();
      await expectVisibleFocus(page);
      await page.keyboard.press("Space");
      await expect(handle(subject)).toHaveAttribute("aria-pressed", "true");
      await page.keyboard.press(key);
      await expect(page.getByText(`${subject}, sıra ${to}.`, { exact: true })).toBeAttached();
      await page.keyboard.press("Space");
      await expect(handle(subject)).not.toHaveAttribute("aria-pressed", "true");
    };

    await move("Türkçe", "ArrowDown", 2);
    await expect.poll(order).toEqual(["Matematik", "Türkçe", "Hayat Bilgisi"]);
    // The new order is saved on the server.
    await page.reload();
    await expect.poll(order).toEqual(["Matematik", "Türkçe", "Hayat Bilgisi"]);

    await move("Türkçe", "ArrowUp", 1);
    await expect.poll(order).toEqual(["Türkçe", "Matematik", "Hayat Bilgisi"]);
  });
});
