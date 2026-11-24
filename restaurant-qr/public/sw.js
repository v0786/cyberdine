const staticCache = "restaurant-static-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name.startsWith("restaurant-static-") && name !== staticCache)
          await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin)
    return;
  if (
    !/^\/assets\/[\w.-]+\.(js|css)$|^\/icon-(192|512)\.png$/.test(url.pathname)
  )
    return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(staticCache);
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    })(),
  );
});
