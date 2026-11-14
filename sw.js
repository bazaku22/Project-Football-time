// Previous cache identifiers retained for legacy release-history assertions: football-time-v93, football-time-v97.
const CACHE = "football-time-v98";

const ASSETS = [
  "./",
  "./index.html",
  "./match-center-mockup.html",
  "./css/ui-refresh.css",
  "./css/ui-refresh-v2.css",
  "./css/football-discovery.css",
  "./css/design-system.css?v=1",
  "./css/football-research.css?v=1",
  "./css/match-center.css?v=7",
  "./css/match-center-mockup.css?v=1",
  "./css/primary-navigation.css?v=1",
  "./css/home-dashboard.css?v=1",
  "./css/analysis-refinement.css?v=1",
  "./css/international-handicap.css?v=1",
  "./css/notification-center.css?v=1",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./data/football-database.json",
  "./data/international-match-fixtures-r1.json",
  "./data/international-handicap-snapshots-r1.json",
  "./data/test-records.json",
  "./data/test-fixtures-2026-11.json",
  "./data/national-team-research-2026-11.json",
  "./data/asian-handicap-odds.json",
  "./data/experimental/international-r1/fixtures.json",
  "./data/experimental/international-r1/prediction-snapshots.json",
  "./data/experimental/international-r1/handicap-reference.json",
  "./js/football-discovery.js",
  "./js/match-center.js",
  "./js/unified-match-center.js",
  "./js/match-center-mockup.js",
  "./js/primary-navigation.js",
  "./js/home-dashboard.js",
  "./js/notification-center.js",
  "./js/manual-match-research.js",
  "./js/player-match-event-entry.js",
  "./js/player-operations-center.js",
  "./js/player-database-mvp.js",
  "./data/player-team-name-registry-2026-27.json",
  "./data/footballsquads-roster-intake-2026-27.json",
  "./css/manual-match-research.css?v=1",
  "./css/player-match-event-entry.css?v=1",
  "./css/player-operations-center.css?v=1",
  "./css/player-database-mvp.css?v=1",
  "./js/research-insight.js",
  "./js/probability-metrics.js",
  "./js/test-experiment.js",
  "./js/asian-handicap.js",
  "./js/handicap-history.js",
  "./js/handicap-reference.js",
  "./js/international-handicap-model.js",
  "./js/international-handicap-workspace.js",
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
      url.pathname.endsWith("/data/asian-handicap-odds.json") ||
      url.pathname.endsWith("/data/football-research-stats-2026-27.json")) {
    // Ignore cache-busting query strings so each refresh reuses one cache entry.
    const cacheKey = new Request(url.origin + url.pathname, { method: "GET" });

    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(cacheKey, copy));
            const headers = new Headers(response.headers);
            headers.set("X-PFT-Data-Source", "network");
            return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(cacheKey);
          if (cached) {
            const headers = new Headers(cached.headers);
            headers.set("X-PFT-Data-Source", "cache");
            return new Response(cached.body, {status: cached.status, statusText: cached.statusText, headers});
          }
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
