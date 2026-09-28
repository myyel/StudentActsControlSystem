import { expect, test } from "@playwright/test";
import { storageStatePath } from "./helpers";

test("manifest is linked and installable", async ({ page, request }) => {
  await page.goto("/giris");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(href).toBeTruthy();

  const manifest = await (await request.get(href!)).json();
  expect(manifest).toMatchObject({ lang: "tr", start_url: "/", display: "standalone" });
  const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
  expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBe(true);

  for (const path of ["/icon/192", "/icon/512", "/apple-icon", "/badge"]) {
    const response = await request.get(path);
    expect(response.ok(), path).toBe(true);
    expect(response.headers()["content-type"], path).toContain("image/png");
  }
});

test.describe("offline", () => {
  test.use({ storageState: storageStatePath("parent") });

  test("a page that cannot load shows the offline screen, and retry recovers", async ({ page, context }) => {
    await page.goto("/veli");
    // First visit installs the worker; it takes control via clients.claim().
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) {
        await new Promise((resolve) => navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true }));
      }
    });

    await context.setOffline(true);
    await page.goto("/veli/mesajlar");
    await expect(page.getByRole("heading", { name: "İnternet bağlantısı yok" })).toBeVisible();
    // The offline screen is styled (CSS came from the worker's cache) and never shows user data.
    await expect(page.getByRole("button", { name: "Tekrar dene" })).toHaveCSS("height", "44px");
    await expect(page.getByText("Ada")).toHaveCount(0);

    await context.setOffline(false);
    await page.getByRole("button", { name: "Tekrar dene" }).click();
    await expect(page).toHaveURL(/\/veli\/mesajlar$/);
    await expect(page.getByRole("heading", { name: "Mesajlar" })).toBeVisible();
  });
});
