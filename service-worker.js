// ============================================
// orOS Service Worker
// Cache-first strategy with network fallback
// Version: 0.9.1
// ============================================

var CACHE_NAME = 'oros-v0.9.1';
var CACHE_URLS = [
  './',
  './index.html',
  './editor.html',
  './converter.html',
  './kanban.html',
  './notes.html',
  './config.js',
  './manifest.json',
  './favicon.svg',
  './translations.json',
  // CSS
  './assets/css/style.css',
  './assets/css/icons.css',
  './assets/css/converter.css',
  './assets/css/kanban.css',
  './assets/css/notes.css',
  // JS — Core
  './assets/js/global-settings.js',
  './assets/js/seo.js',
  './assets/js/main.js',
  // JS — Components
  './assets/js/components/header.js',
  './assets/js/components/footer.js',
  // JS — App Logic
  './assets/js/editor.js',
  './assets/js/converter.js',
  './assets/js/kanban.js',
  './assets/js/notes.js',
  // Fonts
  './assets/fonts/nunito-regular.woff2',
  './assets/fonts/nunito-medium.woff2',
  './assets/fonts/nunito-semibold.woff2',
  './assets/fonts/nunito-bold.woff2',
  './assets/fonts/nunito-extrabold.woff2',
  './assets/fonts/forkawesome-webfont.woff2',
  './assets/fonts/forkawesome-webfont.woff',
  './assets/fonts/forkawesome-webfont.ttf',
  './prompter.html',
'./assets/css/prompter.css',
'./assets/js/prompter.js',
'./assets/js/prompts.json',
  './habits.html',
  './assets/css/habits.css',
  './assets/js/habits.js',
];

// ========== INSTALL ==========
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CACHE_URLS).catch(function(err) {
        console.warn('SW: Some assets failed to cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// ========== ACTIVATE ==========
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ========== FETCH ==========
self.addEventListener('fetch', function(event) {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip cross-origin requests
  if (new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(function(cachedResponse) {
      if (cachedResponse) {
        // Return cached version and update in background
        fetch(event.request).then(function(response) {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, response.clone());
            });
          }
        }).catch(function() {});
        return cachedResponse;
      }

      // Not in cache — fetch from network
      return fetch(event.request).then(function(response) {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        // Cache successful responses
        var responseToCache = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(function() {
        // Offline fallback
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// ========== MESSAGE ==========
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});