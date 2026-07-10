// service-worker.js — Αντικατέστησε ολόκληρο το αρχείο

var CACHE_NAME = 'oros-beta-v8';
var BASE_HREF = '/oros-beta/';

var CACHE_URLS = [
  BASE_HREF,
  BASE_HREF + 'index.html',
  BASE_HREF + 'editor.html',
  BASE_HREF + 'color-lab.html',
  BASE_HREF + 'metronome.html',
  BASE_HREF + 'storyboard.html',
  BASE_HREF + 'config.js',
  BASE_HREF + 'translations.json',
  BASE_HREF + 'manifest.json',
  BASE_HREF + 'favicon.svg',
  BASE_HREF + 'assets/css/style.css',
  BASE_HREF + 'assets/css/icons.css',
  BASE_HREF + 'assets/css/style-storyboard.css',
  BASE_HREF + 'assets/js/main.js',
  BASE_HREF + 'assets/js/editor.js',
  BASE_HREF + 'assets/js/components/header.js',
  BASE_HREF + 'assets/js/components/footer.js',
  BASE_HREF + 'assets/js/color-lab.js',
  BASE_HREF + 'assets/js/metronome.js',
  BASE_HREF + 'assets/js/storyboard.js',
  BASE_HREF + 'assets/fonts/nunito-regular.woff2',
  BASE_HREF + 'assets/fonts/nunito-medium.woff2',
  BASE_HREF + 'assets/fonts/nunito-semibold.woff2',
  BASE_HREF + 'assets/fonts/nunito-bold.woff2',
  BASE_HREF + 'assets/fonts/nunito-extrabold.woff2',
  BASE_HREF + 'assets/fonts/forkawesome-webfont.woff2',
  BASE_HREF + 'assets/fonts/forkawesome-webfont.woff',
  BASE_HREF + 'assets/fonts/forkawesome-webfont.ttf'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(CACHE_URLS);
      })
      .then(function() {
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys()
      .then(function(keys) {
        return Promise.all(
          keys.map(function(key) {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        );
      })
      .then(function() {
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request)
      .then(function(cachedResponse) {
        if (cachedResponse) {
          fetch(event.request).then(function(response) {
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, response.clone());
            });
          }).catch(function() {});
          return cachedResponse;
        }
        return fetch(event.request).then(function(response) {
          if (response && response.status === 200) {
            var responseClone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        }).catch(function() {
          return caches.match(BASE_HREF + 'index.html');
        });
      })
  );
});