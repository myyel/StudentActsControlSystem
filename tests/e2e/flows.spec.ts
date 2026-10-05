import { expect, test, type Page } from "@playwright/test";
import { classId, minTarget, queryOne, smallTargets, storageStatePath, studentId } from "./helpers";

// Main flows in every breakpoint project. Flows that change data undo themselves, and each
// project works on its own student so parallel projects do not interfere.
const SCORING_STUDENT: Record<string, [string, string]> = {
  mobile: ["Can", "Ö"],
  tablet: ["Deniz", "A"],
  desktop: ["Ece", "B"],
  board: ["Efe", "Ç"],
};

async function studentXp(firstName: string, lastInitial: string) {
  const { xp } = await queryOne<{ xp: number }>("SELECT xp FROM student WHERE first_name = $1 AND last_initial = $2", [
    firstName,
    lastInitial,
  ]);
  return xp;
}

/** The low demo thresholds can level a student up; the celebration stays until "Harika!". */
async function dismissCelebration(page: Page) {
  const celebration = page.getByRole("dialog", { name: /büyüdü/ });
  if (await celebration.count()) await celebration.getByRole("button", { name: /Harika|Sıradaki/ }).click();
}

async function expectTargetsInDialog(page: Page, min: number) {
  expect(await smallTargets(page, min, '[role="dialog"]'), "dialog touch targets").toEqual([]);
}

test.describe("teacher", () => {
  test.use({ storageState: storageStatePath("teacher") });

  test("gives a point, then undoes it", async ({ page }, testInfo) => {
    const [firstName, lastInitial] = SCORING_STUDENT[testInfo.project.name]!;
    const name = `${firstName} ${lastInitial}.`;
    const xpBefore = await studentXp(firstName, lastInitial);

    await page.goto(`/ogretmen/siniflar/${await classId("2-A")}`);
    await page.getByRole("button", { name: new RegExp(`^${name}`) }).click();
    const dialog = page.getByRole("dialog", { name });
    await expect(dialog).toBeVisible();
    await expectTargetsInDialog(page, minTarget(testInfo));

    await dialog.getByRole("button", { name: /Derse katıldı/ }).click();
    await expect(dialog).toBeHidden();
    const undo = page.getByRole("button", { name: /Geri al/ });
    await expect(page.getByRole("status").filter({ hasText: name })).toBeVisible();
    await expect.poll(() => studentXp(firstName, lastInitial)).toBeGreaterThan(xpBefore);
    await dismissCelebration(page);

    await undo.click();
    await expect(page.getByText("Geri alındı.")).toBeVisible();
    await expect.poll(() => studentXp(firstName, lastInitial)).toBe(xpBefore);
  });

  test("board mode shows no negative points, balance or XP", async ({ page }) => {
    await page.goto(`/tahta/${await classId("2-A")}`);
    await expect(page.getByRole("heading", { name: "2-A" })).toBeVisible();
    await expect(page.getByText(/XP|denge|Denge/)).toHaveCount(0);

    await page.getByRole("button", { name: /^Ada Y\./ }).click();
    const dialog = page.getByRole("dialog", { name: "Ada ne yaptı?" });
    await expect(dialog).toBeVisible();
    expect(await smallTargets(page, 80, '[role="dialog"]'), "board dialog targets").toEqual([]);
    await expect(dialog.getByText(/[-−]\d/)).toHaveCount(0);
    await expect(dialog.getByText(/Olumsuz/)).toHaveCount(0);

    await dialog.getByRole("button", { name: "Vazgeç" }).click();
    await expect(dialog).toBeHidden();
  });

  test("sets class levels, then goes back to the school levels", async ({ page }, testInfo) => {
    // Class settings are shared by every project, and a raised level never drops: one project,
    // thresholds only go up (nobody is raised) and the type pick is never saved.
    test.skip(testInfo.project.name !== "desktop", "shared class settings");
    const id = await classId("2-A");
    await page.goto(`/ogretmen/siniflar/${id}/karakterler`);

    await page.getByRole("button", { name: "3", exact: true }).click();
    await page.getByLabel("2. seviye").fill("5000");
    await page.getByLabel("3. seviye").fill("9000");
    await page.getByRole("button", { name: "Seviyeleri kaydet" }).click();
    await expect(page.getByText("Bu sınıfın kendi ayarı: 3 seviye.")).toBeVisible();
    const { n } = await queryOne<{ n: number }>("SELECT count(*)::int AS n FROM class_character_level WHERE class_id = $1", [id]);
    expect(n).toBe(3);

    await page.getByRole("button", { name: "Okul ayarına dön" }).click();
    await expect(page.getByText("Bu sınıf okulun seviye ayarını kullanıyor.")).toBeVisible();

    // Removing a type in use asks first; cancelling changes nothing.
    const types = page.getByRole("group", { name: "Sınıfta kullanılacak karakter türleri" });
    const used = types.getByRole("checkbox").first();
    await used.uncheck();
    await page.getByRole("button", { name: "Türleri kaydet" }).click();
    const confirm = page.getByRole("dialog", { name: "Karakterler değişecek" });
    await expect(confirm).toBeVisible();
    await confirm.getByRole("button", { name: "Vazgeç" }).click();
    await expect(confirm).toBeHidden();
  });

  test("rings the activity alarm on the board at its time", async ({ page, browser }) => {
    // Sunday 03:00 in Istanbul: no real board run of the other projects meets this alarm.
    test.skip(test.info().project.name !== "board", "shared class schedule");
    const id = await classId("2-A");
    const setSunday = async (page: Page, on: boolean) => {
      await page.goto(`/ogretmen/siniflar/${id}/etkinlik`);
      const sunday = page.getByRole("checkbox", { name: "Pazar", exact: true });
      await sunday.setChecked(on);
      if (on) {
        await page.locator("#activity-7-time").fill("03:00");
        await page.locator("#activity-7-name").fill("Kitap okuma saati");
      }
      await page.getByRole("button", { name: "Kaydet" }).click();
      await expect(page.getByText("Etkinlik saatleri kaydedildi.")).toBeVisible();
    };

    await setSunday(page, true);
    try {
      await page.clock.install({ time: new Date("2026-10-11T00:00:30Z") });
      await page.goto(`/tahta/${id}`);
      const alarm = page.getByRole("alertdialog", { name: "Kitap okuma saati" });
      await expect(alarm).toBeVisible();
      await expect(alarm.getByText("Saat 03:00")).toBeVisible();
      expect(await smallTargets(page, 80, '[role="alertdialog"]'), "alarm targets").toEqual([]);
      await alarm.getByRole("button", { name: "Tamam" }).click();
      await expect(alarm).toBeHidden();

      // Once a day: opening the board again does not ring.
      await page.reload();
      await expect(page.getByRole("heading", { name: "2-A" })).toBeVisible();
      await expect(alarm).toHaveCount(0);
    } finally {
      // A context without the fake clock, so saving runs on real time.
      const clean = await browser.newContext({
        baseURL: test.info().project.use.baseURL,
        storageState: storageStatePath("teacher"),
      });
      await setSunday(await clean.newPage(), false);
      await clean.close();
    }
  });

  test("cannot open another teacher's class", async ({ page }) => {
    const other = await classId("2-B");
    for (const path of [
      `/ogretmen/siniflar/${other}`,
      `/ogretmen/siniflar/${other}/matris`,
      `/ogretmen/siniflar/${other}/karakterler`,
      `/ogretmen/siniflar/${other}/etkinlik`,
      `/tahta/${other}`,
    ]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(404);
      await expect(page.getByRole("heading", { name: "Bu sayfayı bulamadık" })).toBeVisible();
    }
  });

  test("cannot open parent pages", async ({ page }) => {
    await page.goto("/veli");
    await expect(page).toHaveURL(/\/ogretmen$/);
  });
});

test.describe("parent", () => {
  test.use({ storageState: storageStatePath("parent") });

  test("cannot see another family's child", async ({ page }) => {
    const other = await studentId("Arda", "C");
    for (const path of [`/veli/${other}`, `/veli/${other}/yol-haritasi`]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(404);
      await expect(page.getByRole("heading", { name: "Bu sayfayı bulamadık" })).toBeVisible();
      await expect(page.getByText("Arda")).toHaveCount(0);
    }
  });

  test("cannot open teacher pages", async ({ page }) => {
    await page.goto(`/ogretmen/siniflar/${await classId("2-A")}`);
    await expect(page).toHaveURL(/\/veli/);
  });

  test("marks a home behavior, then undoes it", async ({ page }) => {
    await page.goto(`/veli/${await studentId("Ali", "K")}`);
    const home = page.getByRole("listitem").getByRole("button", { name: /Kitap okudu/ });
    await home.first().click();
    await expect(page.getByRole("status").filter({ hasText: "kaydedildi" })).toBeVisible();
    await dismissCelebration(page);
    await page.getByRole("button", { name: /Geri al/ }).click();
    await expect(page.getByText("Geri alındı.")).toBeVisible();
  });

  test("reads a message and reacts", async ({ page }, testInfo) => {
    // All projects share this message and parent; one project is enough.
    test.skip(testInfo.project.name !== "desktop", "shared seed message");
    await page.goto("/veli/mesajlar");
    await page.getByRole("link", { name: /Ada'nın sunumu/ }).click();
    await expect(page.getByRole("heading", { name: "Ada'nın sunumu" })).toBeVisible();

    const seen = page.getByRole("group", { name: "Hızlı tepki" }).getByRole("button", { name: /Gördüm/ });
    const before = await seen.getAttribute("aria-pressed");
    await seen.click();
    await expect(seen).not.toHaveAttribute("aria-pressed", before!);
    // Leave the seed state as it was for the other projects.
    await seen.click();
    await expect(seen).toHaveAttribute("aria-pressed", before!);
  });
});
