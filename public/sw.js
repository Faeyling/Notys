/* ── Noty's Service Worker ────────────────────────────────────────────────
   Strategy: Cache-First for static assets, Network-First for navigation,
   offline fallback to cached index.html for all navigation requests.
   Required for Google Play TWA verification (installability check).      */

/* Bump this string on every deployment so the activate handler evicts stale assets */
const CACHE_NAME    = 'notys-v2';
const OFFLINE_PAGE  = '/';

/* Assets pre-cached on install so the app loads offline from the first visit */
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

/* ── Install ── pre-populate cache, skip waiting so the SW activates fast */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* ── Activate ── evict outdated caches from previous versions */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* ── Fetch ── Cache-First for same-origin GET requests */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  /* Only intercept same-origin GET requests */
  if (request.method !== 'GET') return;
  if (!request.url.startsWith(self.location.origin)) return;

  /* Skip chrome-extension and non-http(s) schemes */
  if (!request.url.startsWith('http')) return;

  /* Navigation requests (index.html) — Network-First so a new deployment is
     picked up immediately instead of serving a stale shell from cache. */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(OFFLINE_PAGE))
    );
    return;
  }

  /* All other same-origin GET requests — Cache-First (hashed asset filenames
     guarantee freshness; fonts and images rarely change). */
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (
            response.ok &&
            (response.type === 'basic' || response.type === 'cors')
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => undefined);
    })
  );
});
