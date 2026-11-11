const CACHE = "football-time-v44";

const ASSETS = [
  "./",
  "./index.html",
  "./css/ui-refresh.css",
  "./css/ui-refresh-v2.css",
  "./css/football-discovery.css",
  "./css/design-system.css?v=1",
  "./css/match-center.css?v=1",
  "./css/primary-navigation.css?v=1",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./data/football-database.json",
  "./data/test-records.json",
  "./data/test-fixtures-2026-11.json",
  "./data/national-team-research-2026-11.json",
  "./data/player-database.json",
  "./data/asian-handicap-odds.json",
  "./js/player-database.js",
  "./js/football-discovery.js",
  "./js/match-center.js",
  "./js/primary-navigation.js",
  "./js/player-stats-import.js",
  "./js/player-cloud.js",
  "./js/reep-alias-pilot.js",
  "./js/probability-metrics.js",
  "./js/test-experiment.js",
  "./js/asian-handicap.js",
  "./js/test-experiment-enhancements.js"
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
      url.pathname.endsWith("/data/player-database.json") ||
      url.pathname.endsWith("/data/asian-handicap-odds.json")) {
    // Ignore cache-busting query strings so each refresh reuses one cache entry.
    const cacheKey = new Request(url.origin + url.pathname, { method: "GET" });

    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(cacheKey, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(cacheKey);
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
