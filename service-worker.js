// Service Worker for SmartShuttle PWA
const CACHE_NAME = 'smart-shuttle-v2.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/transit-api-badge.svg',
  '/css/index.css',
  '/css/stops.css',
  '/css/routes.css',
  '/css/notifications.css',
  '/css/feedback.css',
  '/css/styles.css',
  '/js/index.js',
  '/js/stops.js',
  '/js/routes.js',
  '/js/notifications.js',
  '/js/feedback.js',
  '/js/utils.js',
  '/js/router.js',
  '/images/alert.svg',
  '/images/attach.svg',
  '/images/back.svg',
  '/images/clock.svg',
  '/images/current.svg',
  '/images/curvedright.svg',
  '/images/directions.svg',
  '/images/feedback.svg',
  '/images/icon.svg',
  '/images/location.svg',
  '/images/map.svg',
  '/images/notification.svg',
  '/images/QR.svg',
  '/images/refresh.svg',
  '/images/search.svg',
  '/images/undraw_location-search.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(() => { })
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (url.pathname.includes('/api/transit/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }

        return fetch(event.request).then(
          response => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });

            return response;
          }
        ).catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});