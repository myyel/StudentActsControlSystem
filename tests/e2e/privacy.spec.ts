import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { PASSWORD, queryOne, storageStatePath, studentId } from "./helpers";

// KVKK flows end to end. Desktop only (playwright.config.ts): they delete seed data
// (Ayşe D. and veli2's account), which the setup project restores on the next run.
test.describe.configure({ mode: "serial" });

async function downloadText(page: Page, linkName: string | RegExp) {
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: linkName }).click()]);
  return readFile((await download.path())!, "utf8");
}

let ayseId: string;

test.beforeAll(async () => {
  ayseId = await studentId("Ayşe", "D");
});

test.describe("veli", () => {
  test.use({ storageState: storageStatePath("parent2") });

  test("downloads their data as JSON and CSV", async ({ page }) => {
    await page.goto("/veli/ayarlar");
    const json = JSON.parse(await downloadText(page, "Tüm verilerimi indir (JSON)"));
    expect(json.account.email).toBe("veli2@ornek.okul");
    expect(json.children.map((c: { name: string }) => c.name)).toEqual(["Ayşe D."]);
    expect(JSON.stringify(json)).not.toContain("Ada");

    const csv = await downloadText(page, /Davranış geçmişi/);
    expect(csv.startsWith("﻿Tarih;Çocuk;Kaynak;Davranış;Puan;XP")).toBe(true);
    expect(csv).toContain(";Ayşe D.;");
  });

  test("asks the school to delete the child's data", async ({ page }) => {
    await page.goto("/veli/ayarlar");
    await page.getByRole("button", { name: "Ayşe D. için silme talebi" }).click();
    await page.getByLabel("Not (isteğe bağlı)").fill("Okuldan ayrılıyoruz.");
    await page.getByRole("button", { name: "Talebi gönder" }).click();
    // The page refreshes into the lasting state (it replaces the form and its success line).
    await expect(page.getByText(/Silme talebi .* tarihinde iletildi/)).toBeVisible();
    await page.reload();
    await expect(page.getByText(/Silme talebi .* tarihinde iletildi/)).toBeVisible();
  });
});

test.describe("yönetici", () => {
  test.use({ storageState: storageStatePath("admin") });

  test("exports and deletes the child after a typed confirmation", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText("1 bekliyor")).toBeVisible();
    await page.getByRole("link", { name: /Silme talepleri/ }).click();
    await expect(page.getByText("Ayşe D. · 2-A")).toBeVisible();
    await expect(page.getByText("“Okuldan ayrılıyoruz.”")).toBeVisible();

    const json = JSON.parse(await downloadText(page, "Verileri indir (JSON)"));
    expect(json.student.name).toBe("Ayşe D.");
    expect(json.parents.map((p: { email: string }) => p.email)).toEqual(["veli2@ornek.okul"]);

    await page.getByRole("button", { name: "Kalıcı olarak sil" }).click();
    const confirm = page.getByLabel(/Onaylamak için öğrencinin adını yazın/);
    await confirm.fill("Ada");
    await page.getByRole("button", { name: "Evet, kalıcı olarak sil" }).click();
    await expect(page.getByText("Yazdığınız ad öğrencinin adıyla eşleşmiyor.")).toBeVisible();
    await confirm.fill("ayşe");
    await page.getByRole("button", { name: "Evet, kalıcı olarak sil" }).click();
    await expect(page.getByText("Bu durumda talep yok.")).toBeVisible();

    const { count } = await queryOne<{ count: number }>("SELECT count(*)::int AS count FROM student WHERE id = $1", [ayseId]);
    expect(count).toBe(0);

    await page.getByRole("link", { name: "Silinen" }).click();
    await expect(page.getByText("Silinmiş öğrenci")).toBeVisible();

    await page.goto("/admin/denetim");
    await page.getByLabel("İşlem").selectOption("student.delete");
    await page.getByRole("button", { name: "Filtrele" }).click();
    await expect(page).toHaveURL(/islem=student\.delete/);
    const entries = page.getByRole("main").getByRole("list");
    await expect(entries.getByText("Öğrenci verileri silindi")).toHaveCount(1);
    await expect(entries.getByText("Ayşe")).toHaveCount(0);
  });
});

test.describe("veli hesabı", () => {
  test.use({ storageState: storageStatePath("parent2") });

  test("deletes the account after the password", async ({ page }) => {
    await page.goto("/veli/hesabi-sil");
    await page.getByLabel("Onaylamak için şifreniz").fill("yanlis-sifre");
    await page.getByRole("button", { name: "Hesabımı kalıcı olarak sil" }).click();
    await expect(page.getByText("Şifre hatalı.")).toBeVisible();

    await page.getByLabel("Onaylamak için şifreniz").fill(PASSWORD);
    await page.getByRole("button", { name: "Hesabımı kalıcı olarak sil" }).click();
    await expect(page).toHaveURL(/\/giris\?hesap=silindi/);
    await expect(page.getByText("Hesabınız silindi.")).toBeVisible();

    await page.goto("/veli");
    await expect(page).toHaveURL(/\/giris/);
    const { count } = await queryOne<{ count: number }>(`SELECT count(*)::int AS count FROM "user" WHERE email = $1`, ["veli2@ornek.okul"]);
    expect(count).toBe(0);
  });
});

test.describe("yetki", () => {
  test("a parent cannot use the admin export, a teacher cannot use the parent export", async ({ browser }) => {
    const parent = await browser.newContext({ storageState: storageStatePath("parent") });
    const teacher = await browser.newContext({ storageState: storageStatePath("teacher") });
    const adaId = await studentId("Ada", "Y");

    expect((await parent.request.get(`/admin/ogrenciler/${adaId}/disa-aktar`)).status()).toBe(403);
    expect((await teacher.request.get("/veli/disa-aktar")).status()).toBe(403);
    expect((await parent.request.get("/veli/disa-aktar?bicim=xml")).status()).toBe(400);
    await Promise.all([parent.close(), teacher.close()]);
  });
});
