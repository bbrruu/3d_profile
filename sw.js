/* ============================================================
   InvestSim Service Worker — v1.1
   Strategy:
     • App shell (HTML/CSS/JS/images) → Cache first, network fallback
     • CDN resources (Chart.js) → Cache first, network fallback
     • API calls (Yahoo Finance, CoinGecko, proxies) → Network only,
       silent fail (returns empty JSON so app shows cached prices)
   ============================================================ */

const CACHE  = 'investsim-v1.1';
const SHELL  = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/utils.js',
  '/js/api.js',
  '/js/storage.js',
  '/js/charts.js',
  '/js/portfolio.js',
  '/js/simulator.js',
  '/js/market.js',
  '/js/app.js',
  '/images/icon-192.png',
  '/images/icon-512.png',
  '/images/apple-touch-icon.png',
  '/manifest.json',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
];

// ── Install: cache app shell ──────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean up old caches ─────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: routing logic ───────────────────────────────────
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // API / external data calls — network only, silent fail
  if (
    url.includes('query1.finance.yahoo.com') ||
    url.includes('query2.finance.yahoo.com') ||
    url.includes('coingecko.com') ||
    url.includes('corsproxy.io') ||
    url.includes('allorigins.win') ||
    url.includes('fonts.googleapis.com') ||
    url.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response('{}', { headers: { 'Content-Type': 'application/json' } })
      )
    );
    return;
  }

  // App shell + CDN — cache first, network fallback, then cache update
  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => null);

      return cached || networkFetch;
    })
  );
});

// ── Background sync message (optional) ───────────────────
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
