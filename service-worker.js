// ============================================
// orOS Writer — Service Worker v0.5-beta
// ============================================

var CACHE_NAME = 'oros-beta-v5';
var BASE = self.registration.scope;

var ASSETS_TO_CACHE = [
  BASE,
  BASE + 'index.html',
  BASE + 'editor.html',
  BASE + 'config.js',
  BASE + 'manifest.json',
  BASE + 'favicon.svg',
  BASE + 'assets/css/style.css',
  BASE + 'assets/css/icons.css',
  BASE + 'assets/js/main.js',
  BASE + 'assets/js/editor.js',
  BASE + 'assets/js/translations.json',
  BASE + 'assets/js/components/header.js',
  BASE + 'assets/js/components/footer.js',
  // Fork Awesome fonts
  BASE + 'assets/fonts/forkawesome-webfont.woff2',
  BASE + 'assets/fonts/forkawesome-webfont.woff',
  BASE + 'assets/fonts/forkawesome-webfont.ttf',
  // Nunito fonts
  BASE + 'assets/fonts/nunito-regular.woff2',
  BASE + 'assets/fonts/nunito-medium.woff2',
  BASE + 'assets/fonts/nunito-semibold.woff2',
  BASE + 'assets/fonts/nunito-bold.woff2',
  BASE + 'assets/fonts/nunito-extrabold.woff2'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS_TO_CACHE).catch(function(err) {
        console.warn('SW: Some assets failed to cache:', err);
      });
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.map(function(name) {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;

      return fetch(event.request).then(function(response) {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
        return response;
      }).catch(function() {
        return cached || new Response('Offline', { status: 503 });
      });
    })
  );
});