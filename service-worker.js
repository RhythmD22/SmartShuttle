// Service Worker for SmartShuttle PWA
const CACHE_NAME = 'smart-shuttle-v1.0';
const urlsToCache = [
  '/SmartShuttle/',
  '/SmartShuttle/index.html',
  '/SmartShuttle/live-tracking.html',
  '/SmartShuttle/live-notifications.html',
  '/SmartShuttle/feedback.html',
  '/SmartShuttle/settings.html',
  '/SmartShuttle/manifest.json',
  '/SmartShuttle/favicon.ico',
  '/SmartShuttle/apple-touch-icon.png',
  '/SmartShuttle/android-chrome-192x192.png',
  '/SmartShuttle/android-chrome-512x512.png',
  '/SmartShuttle/css/index.css',
  '/SmartShuttle/css/live-tracking.css',
  '/SmartShuttle/css/live-notifications.css',
  '/SmartShuttle/css/feedback.css',
  '/SmartShuttle/css/settings.css',
  '/SmartShuttle/js/index.js',
  '/SmartShuttle/js/live-tracking.js',
  '/SmartShuttle/js/live-notifications.js',
  '/SmartShuttle/js/feedback.js',
  '/SmartShuttle/js/settings.js',
  '/SmartShuttle/js/utils.js',
  '/SmartShuttle/images/alert.svg',
  '/SmartShuttle/images/arrow.svg',
  '/SmartShuttle/images/attach.svg',
  '/SmartShuttle/images/back.svg',
  '/SmartShuttle/images/block.svg',
  '/SmartShuttle/images/clock.svg',
  '/SmartShuttle/images/current.svg',
  '/SmartShuttle/images/curvedright.svg',
  '/SmartShuttle/images/directions.svg',
  '/SmartShuttle/images/feedback.svg',
  '/SmartShuttle/images/icon.svg',
  '/SmartShuttle/images/location.svg',
  '/SmartShuttle/images/map.svg',
  '/SmartShuttle/images/notification.svg',
  '/SmartShuttle/images/offstatus.svg',
  '/SmartShuttle/images/onstatus.svg',
  '/SmartShuttle/images/search.svg',
  '/SmartShuttle/images/shuttle.svg',
  '/SmartShuttle/images/stop.svg',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caches opened');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('Failed to cache assets', err);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version if available
        if (response) {
          return response;
        }

        // Otherwise, fetch from network
        return fetch(event.request).then(
          response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response to store in cache
            const responseToCache = response.clone();

            return caches.open(CACHE_NAME)
              .then(cache => {
                return cache.put(event.request, responseToCache);
              })
              .then(() => response);
          }
        ).catch(() => {
          // Serve cached index.html for navigation requests when offline
          if (event.request.mode === 'navigate') {
            return caches.match('/SmartShuttle/index.html');
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
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});