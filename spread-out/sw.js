// Spread Out! service worker — lets the game open with no internet
// after the first visit. Bump CACHE_NAME whenever the app shell files change
// so old installs pick up the new version.
const CACHE_NAME = 'spread-out-v7';
const SHELL = [
  './',
  'index.html',
  'manifest.json',
  'art/stadium-tall.webp',
  'art/stadium-wide.webp',
  'sfx/kick.mp3',
  'sfx/whistle.mp3',
  'sfx/crowd.mp3',
  'sfx/goal.mp3',
  'sfx/aww.mp3',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-512-maskable.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
  'icons/favicon-16.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => {})       // never block install on one bad fetch
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      // Only this game's own old caches. Other games on this address (Football IQ at /football-iq/) keep theirs.
      Promise.all(names.filter((n) => n.startsWith('spread-out-') && n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  // This worker covers the whole address, but /football-iq/ is a different game with its own worker.
  if (new URL(req.url).pathname.startsWith('/football-iq/')) return;
  // The purchase API and the premium script are decided by the server every time.
  if (/\/(api|premium)\//.test(new URL(req.url).pathname)) return;

  // Page navigations: try the network first so updates show up right away,
  // fall back to the cached shell when there's no connection.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put('index.html', copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('index.html'))
    );
    return;
  }

  // The list of Coach Eric clips changes when new lines are recorded, so
  // check the network first and keep the last good copy for offline play.
  if (req.url.endsWith('/voice/manifest.json')) {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Everything else (icons, manifest, voice clips): cache first, then network
  // as backup. Clip files never change (their name is a hash of the words).
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => cached))
  );
});
