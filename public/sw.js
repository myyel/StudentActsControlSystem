// Service worker: Web Push and the offline screen. Hand-written on purpose (phase 8 decision):
// pages are never cached, since they carry children's data and devices are shared. Only the
// static offline page and the files it needs are stored. Push payload: PushMessage in
// src/server/services/push.ts.

const OFFLINE_CACHE = "offline-v1";
const OFFLINE_URL = "/cevrimdisi";

/** Stores the offline page with its CSS/JS/fonts and the icon, replacing the previous set. */
async function cacheOfflinePage() {
  const response = await fetch(OFFLINE_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`offline page: ${response.status}`);
  const html = await response.clone().text();
  const assets = new Set(["/icon/192"]);
  for (const [, url] of html.matchAll(/(?:href|src)="(\/_next\/static\/[^"]+)"/g)) assets.add(url);

  const cache = await caches.open(OFFLINE_CACHE);
  // Hashed file names never change content, so only missing ones are fetched.
  await Promise.all(
    [...assets].map(async (url) => {
      if (!(await cache.match(url))) await cache.add(url);
    }),
  );
  await cache.put(OFFLINE_URL, response);
  for (const request of await cache.keys()) {
    const path = new URL(request.url).pathname;
    if (path !== OFFLINE_URL && !assets.has(path)) await cache.delete(request);
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheOfflinePage().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== OFFLINE_CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

// A deploy changes the offline page's asset hashes without changing this file, so the stored
// copy is refreshed once each time the worker starts.
let refreshed = false;

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || request.method !== "GET") return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then(
        (response) => {
          if (!refreshed) {
            refreshed = true;
            event.waitUntil(cacheOfflinePage().catch(() => {}));
          }
          return response;
        },
        async () => (await caches.match(OFFLINE_URL)) ?? Response.error(),
      ),
    );
    return;
  }

  // The offline page's own files: network first, the stored copy when offline.
  if (url.pathname.startsWith("/_next/static/") || url.pathname === "/icon/192") {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match(request, { cacheName: OFFLINE_CACHE })) ?? Response.error()),
    );
  }
});

self.addEventListener("push", (event) => {
  let data = { title: "Yeni bildirim", body: "", url: "/veli/bildirimler", tag: undefined };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
    // A push without a JSON payload still shows a generic notification.
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag,
      icon: "/icon/192",
      badge: "/badge",
      lang: "tr",
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = event.notification.data?.url;
  // Only same-origin paths.
  const target = new URL(typeof path === "string" && path.startsWith("/") && !path.startsWith("//") ? path : "/", self.location.origin);

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((w) => new URL(w.url).origin === target.origin);
      if (open) {
        await open.focus();
        return open.navigate(target.href);
      }
      return self.clients.openWindow(target.href);
    })(),
  );
});
