const CACHE_NAME = 'solar-observatory-' + new URL(self.registration.scope).pathname + '-6563a1764d8bce14';
const PRECACHE = ["app-icons/icon-180.png","app-icons/icon-192.png","app-icons/icon-512.png","assets/asteroid-sprite.png","assets/asteroids.json","assets/earth.jpg","assets/milky-way.jpg","assets/moon.jpg","glow-texture.js","icons.js","index.html","main.js","manifest.webmanifest","orbital-math.js","pwa.js","style.css","vendor/OrbitControls.js","vendor/astronomy.js","vendor/three.module.js","view-state.js"];
const PREFIX =
  "solar-observatory-" + new URL(self.registration.scope).pathname + "-";
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll(
          PRECACHE.map(
            (path) =>
              new Request(new URL(path, self.registration.scope), {
                cache: "reload",
              }),
          ),
        ),
      ),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key.startsWith(PREFIX) && key !== CACHE_NAME)
          await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "APPLY_UPDATE") self.skipWaiting();
});
self.addEventListener("fetch", (event) => {
  const request = event.request,
    url = new URL(request.url),
    scope = new URL(self.registration.scope);
  if (
    request.method !== "GET" ||
    url.origin !== scope.origin ||
    !url.pathname.startsWith(scope.pathname)
  )
    return;
  const relative = url.pathname.slice(scope.pathname.length),
    navigation =
      request.mode === "navigate" &&
      (relative === "" || relative === "index.html");
  if (!navigation && !PRECACHE.includes(relative)) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME),
        cached = await cache.match(
          new URL(navigation ? "index.html" : relative, scope).href,
          { ignoreSearch: true },
        );
      return cached || fetch(request);
    })(),
  );
});
