// Service Worker for SmartShuttle PWA
const CACHE_NAME = 'smart-shuttle-v1.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/live-tracking.html',
  '/live-notifications.html',
  '/feedback.html',
  '/settings.html',
  '/manifest.json',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/css/index.css',
  '/css/live-tracking.css',
  '/css/live-notifications.css',
  '/css/feedback.css',
  '/css/settings.css',
  '/js/index.js',
  '/js/live-tracking.js',
  '/js/live-notifications.js',
  '/js/feedback.js',
  '/js/settings.js',
  '/js/utils.js',
  '/images/alert.svg',
  '/images/arrow.svg',
  '/images/attach.svg',
  '/images/back.svg',
  '/images/block.svg',
  '/images/clock.svg',
  '/images/current.svg',
  '/images/curvedright.svg',
  '/images/directions.svg',
  '/images/feedback.svg',
  '/images/icon.svg',
  '/images/location.svg',
  '/images/map.svg',
  '/images/notification.svg',
  '/images/refresh.svg',
  '/images/search.svg',
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
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});