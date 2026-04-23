/* ── Noty's Service Worker ────────────────────────────────────────────────
   Strategy: Cache-First for static assets, Network-First for navigation,
   offline fallback to cached index.html for all navigation requests.
   Required for Google Play TWA verification (installability check).      */

const CACHE_NAME    = 'notys-v1';
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

  event.respondWith(
    caches.match(request).then((cached) => {
      /* Cache hit — return immediately (Cache-First) */
      if (cached) return cached;

      /* Cache miss — fetch from network */
      return fetch(request)
        .then((response) => {
          /* Only cache successful, opaque-safe responses */
          if (
            response.ok &&
            (response.type === 'basic' || response.type === 'cors')
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          /* Network failed — return cached offline fallback for navigation */
          if (request.mode === 'navigate') {
            return caches.match(OFFLINE_PAGE);
          }
          /* For other asset types, let the failure propagate */
        });
    })
  );
});
