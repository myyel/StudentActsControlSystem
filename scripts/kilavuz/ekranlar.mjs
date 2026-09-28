// Kullanım kılavuzu için ekran görüntüleri (docs/kilavuz/img). Örnek verili, çalışan bir uygulama ister:
//   BASE_URL=http://localhost:3100 DAVET_KODU=XXXX-XXXX node scripts/kilavuz/ekranlar.mjs
// DAVET_KODU: seed'in yazdığı kullanılmamış tek kullanımlık bir kod (veli kaydı senaryosu için).
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const CODE = process.env.DAVET_KODU;
const PASSWORD = "Sifre1234!";
const OUT = path.resolve("docs/kilavuz/img");
mkdirSync(OUT, { recursive: true });

const DESKTOP = { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 };
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const BOARD = { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, hasTouch: true };

const failures = [];
const browser = await chromium.launch();

async function newPage(device) {
  const context = await browser.newContext({ ...device, baseURL: BASE, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  const page = await context.newPage();
  // Quiet, settled screenshots: no caret blink or half-finished transitions.
  await page.addInitScript(() => {
    addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = "*{caret-color:transparent!important;transition:none!important}";
      document.head.append(style);
    });
  });
  return page;
}

async function login(page, email) {
  await page.goto("/giris");
  await page.getByLabel("E-posta").fill(email);
  await page.getByLabel("Şifre").fill(PASSWORD);
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/giris"));
}

/** Red outline around the element the step talks about. */
async function mark(locator) {
  await locator.first().evaluate((el) => {
    el.dataset.kilavuz = "1";
    el.style.outline = "4px solid #e11d48";
    el.style.outlineOffset = "4px";
  });
}
async function unmarkAll(page) {
  await page.evaluate(() =>
    document.querySelectorAll("[data-kilavuz]").forEach((el) => {
      el.style.outline = "";
      delete el.dataset.kilavuz;
    }),
  );
}

/** Scrolls the card with this title (or the text itself) to the top of the viewport. */
async function scrollTo(page, text) {
  await page.getByText(text, { exact: true }).first().evaluate((el) => {
    (el.closest("[data-slot=card]") ?? el).scrollIntoView({ block: "start" });
    window.scrollBy(0, -12);
  });
}

async function settle(page) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
}

/** Screenshot a step; failures are collected so one broken step does not stop the rest. */
async function shot(name, page, { full = false, maxHeight = 0, locator = null, before = null } = {}) {
  try {
    if (before) await before();
    await settle(page);
    const file = path.join(OUT, `${name}.jpg`);
    if (locator) await locator.first().screenshot({ path: file, type: "jpeg", quality: 82 });
    else if (maxHeight) {
      // The top of a long page: readable in the PDF, unlike a very tall full-page shot.
      const { width } = page.viewportSize();
      await page.screenshot({ path: file, type: "jpeg", quality: 82, fullPage: true, clip: { x: 0, y: 0, width, height: maxHeight } });
    } else await page.screenshot({ path: file, type: "jpeg", quality: 82, fullPage: full });
    await unmarkAll(page);
    console.log("✓", name);
  } catch (error) {
    failures.push(`${name}: ${error.message.split("\n")[0]}`);
    console.log("✗", name, error.message.split("\n")[0]);
    await unmarkAll(page).catch(() => {});
  }
}

const classUrl = async (page) => {
  await page.goto("/ogretmen");
  await page.getByRole("link", { name: /2-A/ }).first().click();
  await page.waitForURL(/\/ogretmen\/siniflar\//);
  return new URL(page.url()).pathname;
};

// ─── Giriş ve genel ekranlar ──────────────────────────────────────────────
{
  const page = await newPage(DESKTOP);
  await shot("giris", page, {
    before: async () => {
      await page.goto("/giris");
      await page.getByLabel("E-posta").fill("ogretmen@ornek.okul");
    },
  });
  await page.close();

  const phone = await newPage(PHONE);
  await shot("giris-telefon", phone, { before: () => phone.goto("/giris") });
  await shot("cevrimdisi", phone, { before: () => phone.goto("/cevrimdisi") });
  await shot("bulunamadi", phone, { before: () => phone.goto("/yok-boyle-bir-sayfa") });
  await phone.close();
}

// ─── Öğretmen ─────────────────────────────────────────────────────────────
{
  const page = await newPage(DESKTOP);
  await login(page, "ogretmen@ornek.okul");
  await shot("ogretmen-siniflarim", page, { full: true, before: () => page.goto("/ogretmen") });

  const base = await classUrl(page);
  await shot("ogretmen-puanlama", page, {
    before: async () => {
      await page.goto(base);
      await mark(page.getByRole("navigation").or(page.locator("a", { hasText: "Matris" }).locator("..")));
    },
  });

  // Karta dokun → davranış seç
  await shot("ogretmen-davranis-sec", page, {
    before: async () => {
      await page.getByRole("button", { name: /^Ada Y\./ }).click();
      await page.getByRole("dialog").waitFor();
    },
  });
  await shot("ogretmen-geri-al", page, {
    before: async () => {
      await page.getByRole("dialog").getByRole("button", { name: /Derse katıldı/ }).click();
      await page.getByRole("button", { name: /Geri al/ }).waitFor();
      await mark(page.getByRole("status").filter({ hasText: "Ada" }));
    },
  });
  await page.getByRole("button", { name: /Geri al/ }).click().catch(() => {});
  await page.waitForTimeout(1500);

  // Not ekleme
  await shot("ogretmen-not-ekle", page, {
    before: async () => {
      await page.getByRole("button", { name: /^Ali K\./ }).click();
      const dialog = page.getByRole("dialog");
      await dialog.waitFor();
      const noteButton = dialog.getByRole("button", { name: /not/i });
      if (await noteButton.count()) await noteButton.first().click();
      const area = dialog.getByRole("textbox");
      if (await area.count()) await area.first().fill("Arkadaşına matematikte yardım etti.");
    },
  });
  await page.keyboard.press("Escape");

  // Çoklu seçim
  await shot("ogretmen-coklu-secim", page, {
    before: async () => {
      await page.getByRole("button", { name: "Çoklu seç" }).click();
      for (const n of ["Ayşe D.", "Can Ö.", "Ece B."]) await page.getByRole("button", { name: new RegExp(`^${n}`) }).click();
      await mark(page.getByRole("button", { name: /öğrenciye puan ver/ }));
    },
  });
  await page.getByRole("button", { name: "Çoklu seçimi kapat" }).click();

  // Seviye atlama kutlaması (Deniz A. 7 XP → +2)
  await shot("ogretmen-seviye-atlama", page, {
    before: async () => {
      await page.getByRole("button", { name: /^Deniz A\./ }).click();
      await page.getByRole("dialog").getByRole("button", { name: /Harika iş/ }).click();
      await page.getByText(/seviye/i).first().waitFor({ timeout: 5000 });
      await page.waitForTimeout(1200);
    },
  });
  await page.keyboard.press("Escape");
  await page.goto(base);

  await shot("ogretmen-ogrenci-ekle", page, {
    locator: page.locator("div", { has: page.getByText("Öğrenci ekle", { exact: true }) }).filter({ has: page.getByText("Toplu ekle", { exact: true }) }).last(),
    before: async () => {
      await page.getByLabel(/Her satıra bir öğrenci/).fill("Aras Yıldız\nBade K.").catch(() => {});
    },
  });

  // Öğrenci detayı
  await page.goto(base);
  await page.getByRole("button", { name: /^Ada Y\./ }).click();
  await page.getByRole("dialog").getByRole("link", { name: /Öğrenci detayı/ }).click();
  await page.waitForURL(/ogrenciler/);
  const studentUrl = new URL(page.url()).pathname;
  await shot("ogretmen-ogrenci-detay", page);
  await shot("ogretmen-zaman-cizelgesi", page, { before: () => scrollTo(page, "Zaman çizelgesi") });
  await shot("ogretmen-ogrenci-bilgiler", page, { before: () => scrollTo(page, "Bilgiler") });
  await shot("ogretmen-davet-kodu", page, {
    before: async () => {
      await page.getByRole("button", { name: /Davet kodu üret/ }).click();
      await page.getByText(/Kod üretildi/).waitFor();
    },
    locator: page.locator("[data-slot=card]").filter({ hasText: "Veli davet kodu" }),
  });

  await shot("ogretmen-davranislar", page, { full: true, before: () => page.goto(`${base}/davranislar`) });
  await shot("ogretmen-duraklar", page, { before: () => page.goto(`${base}/duraklar`) });
  await shot("ogretmen-matris", page, { before: () => page.goto(`${base}/matris`) });
  await shot("ogretmen-mesajlar", page, {
    maxHeight: 1100,
    before: async () => {
      await page.goto(`${base}/mesajlar`);
      const details = page.locator("details summary");
      if (await details.count()) await details.first().click();
    },
  });
  await shot("ogretmen-davet-kartlari", page, {
    before: async () => {
      await page.goto(`${base}/davetler`);
      await page.getByRole("button", { name: /Davet kartlarını üret/ }).click();
      await page.getByRole("button", { name: /Kartları yazdır|Yazdır/ }).first().waitFor();
    },
  });
  void studentUrl;
  await page.close();

  // Tahta modu (akıllı tahta, 1920 px)
  const board = await newPage(BOARD);
  await login(board, "ogretmen@ornek.okul");
  const boardBase = await classUrl(board);
  const boardUrl = boardBase.replace("/ogretmen/siniflar/", "/tahta/");
  await shot("tahta", board, { before: () => board.goto(boardUrl) });
  await shot("tahta-davranis-sec", board, {
    before: async () => {
      await board.getByRole("button", { name: /^Elif Ş\./ }).click();
      await board.getByRole("dialog").waitFor();
    },
  });
  await shot("tahta-geri-al", board, {
    before: async () => {
      await board.getByRole("dialog").getByRole("button", { name: /Yardımlaştı/ }).click();
      await board.getByRole("button", { name: /Geri al/ }).waitFor();
    },
  });
  await board.getByRole("button", { name: /Geri al/ }).click().catch(() => {});
  await board.close();
}

// ─── Veli: davet koduyla kayıt ────────────────────────────────────────────
if (CODE) {
  const page = await newPage(PHONE);
  await shot("veli-davet-kodu", page, { full: true, before: () => page.goto(`/davet/${CODE}`) });
  await shot("veli-kayit-formu", page, {
    full: true,
    before: async () => {
      await page.getByLabel("Adınız ve soyadınız").fill("Zehra Çelik");
      await page.getByLabel("E-posta").fill("zehra.celik@ornek.com");
      await page.getByLabel("Şifre", { exact: true }).fill("GucluSifre2026!");
      await page.getByLabel("Çocuğunuzla yakınlığınız").selectOption({ label: "Anne" });
      for (const box of await page.getByRole("checkbox").all()) await box.check();
    },
  });
  await page.getByRole("button", { name: /Hesap oluştur/ }).click();
  await page.waitForURL(/\/veli/, { timeout: 15000 }).catch(() => {});
  await shot("veli-yeni-panel", page);
  await page.close();
}

// ─── Veli (veli1: Ada ve Ali) ─────────────────────────────────────────────
{
  const page = await newPage(PHONE);
  await login(page, "veli1@ornek.okul");
  await page.goto("/veli");
  await page.waitForURL(/\/veli\/.+/).catch(() => {});
  const panelUrl = new URL(page.url()).pathname;
  await shot("veli-panel-ust", page, { before: () => mark(page.getByRole("navigation").first()) });
  await shot("veli-bu-hafta", page, { before: () => scrollTo(page, "Bu hafta") });
  await shot("veli-son-olaylar", page, { before: () => scrollTo(page, "Son olaylar") });
  await shot("veli-yol-haritasi-ozet", page, { before: () => scrollTo(page, "Akademik yol haritası") });
  await page.evaluate(() => scrollTo(0, 0));
  await shot("veli-cocuk-secici", page, {
    before: async () => {
      await page.goto(panelUrl);
      await mark(page.getByRole("link", { name: /Ali K\./ }).or(page.getByText("Ali K.")).first());
    },
  });

  // Ev davranışı
  const home = page.locator("section, [data-slot=card]").filter({ hasText: "Bugün evden kazanılan XP" }).last();
  await shot("veli-ev-davranisi", page, { locator: home });
  await shot("veli-ev-geri-al", page, {
    before: async () => {
      await home.getByRole("button", { name: /Kitap okudu/ }).click();
      await page.getByRole("button", { name: /Geri al/ }).waitFor();
    },
  });
  await page.getByRole("button", { name: /Geri al/ }).click().catch(() => {});
  await page.waitForTimeout(1000);

  await shot("veli-yol-haritasi", page, { before: () => page.goto(`${panelUrl}/yol-haritasi`) });
  await shot("veli-mesajlar", page, { full: true, before: () => page.goto("/veli/mesajlar") });
  await shot("veli-mesaj-detay", page, {
    full: true,
    before: async () => {
      await page.getByRole("link", { name: /Ada'nın sunumu/ }).click();
      await page.getByRole("group", { name: "Hızlı tepki" }).waitFor();
      await mark(page.getByRole("group", { name: "Hızlı tepki" }));
    },
  });
  await shot("veli-bildirimler", page, { before: () => page.goto("/veli/bildirimler") });
  await shot("veli-ayarlar", page, { before: () => page.goto("/veli/ayarlar") });
  await shot("veli-ios-rehberi", page, { before: () => scrollTo(page, "iPhone ve iPad: Ana ekrana ekle") });
  await shot("veli-verileriniz", page, {
    locator: page.locator("#verileriniz"),
    before: async () => {
      await page.goto("/veli/ayarlar");
      await page.getByRole("button", { name: "Ali K. için silme talebi" }).click();
      await page.getByLabel("Not (isteğe bağlı)").first().fill("Başka bir şehre taşınıyoruz.");
    },
  });
  await page.getByRole("button", { name: "Talebi gönder" }).click();
  await page.getByText(/Silme talebi .* tarihinde iletildi/).waitFor().catch(() => {});
  await shot("veli-cocuk-ekle", page, { full: true, before: () => page.goto("/veli/cocuk-ekle") });
  await shot("veli-hesabi-sil", page, { full: true, before: () => page.goto("/veli/hesabi-sil") });
  await page.close();

  const desk = await newPage(DESKTOP);
  await login(desk, "veli1@ornek.okul");
  await shot("veli-panel-masaustu", desk, { before: () => desk.goto(panelUrl) });
  await desk.close();
}

// ─── Yönetici ─────────────────────────────────────────────────────────────
{
  const page = await newPage(DESKTOP);
  await login(page, "admin@ornek.okul");
  await shot("yonetici-panel", page, { before: () => page.goto("/admin") });
  await shot("yonetici-karakterler", page, { before: () => page.goto("/admin/karakterler") });
  await shot("yonetici-silme-talepleri", page, { full: true, before: () => page.goto("/admin/silme-talepleri") });
  await shot("yonetici-silme-onay", page, {
    before: async () => {
      await page.getByRole("button", { name: "Kalıcı olarak sil" }).click();
      await page.getByLabel(/Onaylamak için öğrencinin adını yazın/).fill("Ali");
    },
  });
  await shot("yonetici-denetim", page, { before: () => page.goto("/admin/denetim") });
  await shot("yonetici-denetim-filtre", page, {
    before: async () => {
      await page.getByLabel("İşlem").selectOption("behavior.give");
      await page.getByRole("button", { name: "Filtrele" }).click();
      await page.waitForURL(/islem=/);
      await page.locator("details summary").first().click();
    },
  });
  await page.close();
}

await browser.close();
if (failures.length) {
  console.log(`\n${failures.length} ekran alınamadı:\n${failures.join("\n")}`);
  process.exitCode = 1;
}
