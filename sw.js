const CACHE = "football-time-v25";

const ASSETS = [
  "./",
  "./index.html",
  "./css/ui-refresh.css",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./data/football-database.json",
  "./data/test-records.json",
  "./data/player-database.json",
  "./js/player-database.js",
  "./js/player-cloud.js",
  "./js/reep-alias-pilot.js"
];

// Install service worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate service worker
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) =>
              key.startsWith("football-time-") &&
              key !== CACHE
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch requests
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.pathname.endsWith("/data/football-database.json") ||
      url.pathname.endsWith("/data/player-database.json")) {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(JSON.stringify({error:"Football database is unavailable"}), {
            status:503,headers:{"Content-Type":"application/json"}
          });
        })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
