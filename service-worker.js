// ============================================
// orOS — Service Worker
// Dynamic scope-based caching (no hardcoded paths)
// ============================================

var SCOPE = self.registration.scope;
var IS_BETA = SCOPE.indexOf('oros-beta') !== -1;
var CACHE_NAME = 'oros-' + (IS_BETA ? 'beta-' : '') +
                 ((window.OROS_CONFIG && window.OROS_CONFIG.swCacheVersion) || 'v5');

// Note: SW can't read window variables, so we derive everything from scope
var CACHE_VERSION = 'v5';
CACHE_NAME = 'oros-' + (IS_BETA ? 'beta-' : '') + CACHE_VERSION;

var ASSETS_TO_CACHE = [
  '',
  'index.html',
  'editor.html',
  'config.js',
  'favicon.svg',
  'manifest.json',
  'assets/css/style.css',
  'assets/css/icons.css',
  'assets/fonts/nunito-regular.woff2',
  'assets/fonts/nunito-medium.woff2',
  'assets/fonts/nunito-semibold.woff2',
  'assets/fonts/nunito-bold.woff2',
  'assets/fonts/nunito-extrabold.woff2',
  // Fork Awesome fonts — uncomment αφού τα προσθέσεις:
  // 'assets/fonts/forkawesome-webfont.woff2',
  // 'assets/fonts/forkawesome-webfont.woff',
  // 'assets/fonts/forkawesome-webfont.ttf',
  'assets/js/editor.js',
  'assets/js/main.js',
  'assets/js/translations.json',
  'assets/js/components/header.js',
  'assets/js/components/footer.js'
];

var FULL_URLS = ASSETS_TO_CACHE.map(function(asset) {
  return SCOPE + asset;
});

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // Use individual add() so one 404 doesn't kill the whole cache
      return Promise.all(
        FULL_URLS.map(function(url) {
          return cache.add(url).catch(function() {
            console.warn('[SW] Could not cache:', url);
          });
        })
      );
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(name) {
          return name !== CACHE_NAME;
        }).map(function(name) {
          return caches.delete(name);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  // Only handle GET
  if (event.request.method !== 'GET') return;

  // Only handle same-origin requests
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for navigation, cache-first for assets
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(function() {
        return caches.match(event.request).then(function(resp) {
          return resp || caches.match(SCOPE + 'index.html');
        });
      })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(function(resp) {
        return resp || fetch(event.request).then(function(response) {
          if (response.ok) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, clone);
            });
          }
          return response;
        });
      })
    );
  }
});