import { expect, test } from "@playwright/test";
import {
  axeViolations,
  classId,
  expectNoHorizontalScroll,
  minTarget,
  queryOne,
  smallTargets,
  storageStatePath,
  studentId,
  type Role,
} from "./helpers";

// Every key screen in every breakpoint project: no horizontal scroll, large enough touch
// targets, and an axe WCAG 2 AA scan (contrast included) in light and dark mode.

type Screen = { name: string; path: () => Promise<string>; board?: boolean };

const SCREENS: Partial<Record<Role | "guest", Screen[]>> = {
  guest: [
    { name: "giriş", path: async () => "/giris" },
    { name: "KVKK aydınlatma", path: async () => "/kvkk/aydinlatma" },
    { name: "çevrimdışı", path: async () => "/cevrimdisi" },
    { name: "bulunamadı", path: async () => "/yok-boyle-bir-sayfa" },
  ],
  teacher: [
    { name: "sınıflarım", path: async () => "/ogretmen" },
    { name: "puanlama", path: async () => `/ogretmen/siniflar/${await classId("2-A")}` },
    { name: "matris", path: async () => `/ogretmen/siniflar/${await classId("2-A")}/matris` },
    { name: "davranışlar", path: async () => `/ogretmen/siniflar/${await classId("2-A")}/davranislar` },
    { name: "duraklar", path: async () => `/ogretmen/siniflar/${await classId("2-A")}/duraklar` },
    { name: "mesajlar", path: async () => `/ogretmen/siniflar/${await classId("2-A")}/mesajlar` },
    { name: "davetler", path: async () => `/ogretmen/siniflar/${await classId("2-A")}/davetler` },
    {
      name: "öğrenci detayı",
      path: async () => `/ogretmen/siniflar/${await classId("2-A")}/ogrenciler/${await studentId("Ada", "Y")}`,
    },
    { name: "tahta", path: async () => `/tahta/${await classId("2-A")}`, board: true },
    {
      name: "tahtada karakter seçimi",
      path: async () => `/tahta/${await classId("2-A")}?karakter=${await studentId("Ada", "Y")}`,
      board: true,
    },
  ],
  parent: [
    { name: "veli paneli", path: async () => `/veli/${await studentId("Ada", "Y")}` },
    { name: "macera haritası", path: async () => `/veli/${await studentId("Ada", "Y")}/yol-haritasi` },
    { name: "hoş geldiniz", path: async () => `/veli/${await studentId("Ada", "Y")}?hosgeldin=1` },
    { name: "mesajlar", path: async () => "/veli/mesajlar" },
    {
      name: "mesaj detayı",
      path: async () => {
        const { id } = await queryOne<{ id: string }>("SELECT id FROM message WHERE title = $1", ["Ada'nın sunumu"]);
        return `/veli/mesajlar/${id}`;
      },
    },
    { name: "bildirimler", path: async () => "/veli/bildirimler" },
    { name: "ayarlar", path: async () => "/veli/ayarlar" },
    { name: "çocuk ekle", path: async () => "/veli/cocuk-ekle" },
    { name: "hesabı sil", path: async () => "/veli/hesabi-sil" },
  ],
  admin: [
    { name: "yönetim", path: async () => "/admin" },
    { name: "karakterler", path: async () => "/admin/karakterler" },
    { name: "silme talepleri", path: async () => "/admin/silme-talepleri" },
    { name: "denetim kaydı", path: async () => "/admin/denetim" },
  ],
};

for (const [role, screens] of Object.entries(SCREENS)) {
  test.describe(role, () => {
    if (role !== "guest") test.use({ storageState: storageStatePath(role as Role) });

    for (const screen of screens ?? []) {
      test(screen.name, async ({ page }, testInfo) => {
        await page.goto(await screen.path());
        await expect(page.locator("main")).toBeVisible();
        await page.waitForLoadState("networkidle");

        await expectNoHorizontalScroll(page);
        expect.soft(await smallTargets(page, minTarget(testInfo, screen.board)), "touch targets too small").toEqual([]);

        expect.soft(await axeViolations(page), "axe (light)").toEqual([]);
        await page.emulateMedia({ colorScheme: "dark" });
        expect.soft(await axeViolations(page), "axe (dark)").toEqual([]);
      });
    }
  });
}
