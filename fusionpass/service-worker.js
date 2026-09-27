// Retires the service worker the earlier Stremio-based web app installed at this origin's root:
// it would otherwise keep serving that app from its cache. Clears its caches, unregisters, and
// reloads open tabs onto the Fusion Pass app. The Fusion Pass app itself registers no worker.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const tabs = await self.clients.matchAll({ type: "window" });
      tabs.forEach((tab) => tab.navigate(tab.url));
    })()
  );
});
