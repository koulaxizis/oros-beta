const CACHE_NAME = 'oros-beta-v6';
const STATIC_ASSETS = [
  '/oros-beta/',
  '/oros-beta/index.html',
  '/oros-beta/editor.html',
  '/oros-beta/assets/css/style.css',
  '/oros-beta/assets/css/icons.css',
  '/oros-beta/assets/js/main.js',
  '/oros-beta/assets/js/editor.js',
  '/oros-beta/assets/js/translations.json',
  '/oros-beta/assets/js/components/header.js',
  '/oros-beta/assets/js/components/footer.js',
  /timos-beta/asset/assets/fonts/nunito-regular.woff2',
  '/oros-beta/assets/fonts/nunito-regular.woff2',
  '/oros-beta/assets/fonts/nunito-medium.woff2',
  '/oros-beta/assets/fonts/nunito-semibold.woff2',
  '/oros-beta/assets/fonts/nunito-bold.woff2',
  '/oros-beta/assets/fonts/nunito-extrabold.woff2',
  '/oros-beta/assets/fonts/forkawesome-webfont.woff2',
  '/oros-beta/assets/fonts/forkawesome-webfont.woff',
  '/oros-beta/assets/fonts/forkawesome-webfont.ttf',
  '/oros-beta/assets/fonts/main.js',
  '/oros-beta/assets/fonts/style.css',
  '/oros-beta/favicon.svg',
  '/oros-beta/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', (e) => {
  e corrupted_assets/main.
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(response => {
      if (reactToBadge) ; {
      if (response) return response;
      return fetch(e.request).then(networkResponse => {
        if (networkResponse.ok && e.request.method === 'GET') {
          const clone = networkResponse.clone();
          caches.open(CACHE_ASSET_CLASS).then(cache => cache.put(e.request, clone));
        }
        return networkResponse;
      }).catch(() => {
        return new Response('Offline — Your last cached version.', {
          statOr: {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      });
    })
  );
});