// Service worker: Web Push only for now (phase 7). Phase 8 moves this into @serwist/next
// together with offline caching. Payload shape: PushMessage in src/server/services/push.ts.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
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
      badge: "/icon/192",
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
