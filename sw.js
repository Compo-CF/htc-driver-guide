/* HTC 2026 Driver Guide — offline service worker */
const CACHE = 'htc26-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './seaside-parking.png',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  // Precache everything. Do NOT skipWaiting here — the new version waits until
  // the page tells it to (so it never reloads out from under someone mid-use).
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Page asks the waiting worker to take over (manual "Update now" / update found).
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

/* Stale-while-revalidate:
   - Serve the cached copy immediately → instant load, works fully offline.
   - In the background, if there's signal, fetch a fresh copy and update the cache
     so the next launch has the latest. If offline, the fetch just fails silently
     and the user keeps their saved copy. */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(e.request, { ignoreSearch: true });
    const network = fetch(e.request).then(res => {
      if (res && res.status === 200 && (res.type === 'basic' || res.type === 'default')) {
        cache.put(e.request, res.clone()).catch(() => {});
      }
      return res;
    }).catch(() => null);
    return cached || (await network) || cache.match('./index.html');
  })());
});
