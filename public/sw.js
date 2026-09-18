const CACHE_NAME = 'apollo-engineering-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/logo.webp',
  '/manifest.json',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first strategy with cache fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests, non-http(s) schemes, and API calls
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!['http:', 'https:'].includes(url.protocol)) return;
  if (event.request.url.includes('/api/')) return;
  if (event.request.url.includes('msg91')) return;
  if (event.request.url.includes('razorpay')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          // For navigation requests, return cached index.html
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});
