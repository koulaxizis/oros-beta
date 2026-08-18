var CACHE_VERSION = 'orOS-v2.0';
var CACHE_ASSETS = [
  './',
  './index.html',
  './editor.html',
  './converter.html',
  './case.html',
  './kanban.html',
  './wiki.html',
  './config.js',
  './manifest.json',
  './favicon.svg',

  // CSS
  './assets/css/style.css',
  './assets/css/icons.css',
  './assets/css/editor.css',
  './assets/css/converter.css',
  './assets/css/case.css',
  './assets/css/kanban.css',
  './assets/css/wiki.css',

  // JS — shared
  './assets/js/global-settings.js',
  './assets/js/seo.js',
  './assets/js/components/header.js',
  './assets/js/components/footer.js',
  './assets/js/main.js',

  // JS — app-specific
  './assets/js/editor.js',
  './assets/js/converter.js',
  './assets/js/case.js',
  './assets/js/kanban.js',
  './assets/js/wiki.js',

  // Fonts
  './assets/fonts/nunito-regular.woff2',
  './assets/fonts/nunito-medium.woff2',
  './assets/fonts/nunito-semibold.woff2',
  './assets/fonts/nunito-bold.woff2',
  './assets/fonts/nunito-extrabold.woff2'
];

// Install — pre-cache
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(function(cache) {
      return cache.addAll(CACHE_ASSETS);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Activate — clean old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_VERSION; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch — stale-while-revalidate
self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      var fetchPromise = fetch(e.request).then(function(response) {
        if (response && response.status === 200 && response.type === 'basic') {
          var clone = response.clone();
          caches.open(CACHE_VERSION).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      }).catch(function() {
        return cached;
      });
      return cached || fetchPromise;
    })
  );
});