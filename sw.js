const CACHE_NAME = "helperai-static-v2";
const STATIC_FILES = ["index.html", "manifest.json", "logo.png", "style.css"];

self.addEventListener("install", evt => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", evt => {
  // Clean up old caches
  evt.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  clients.claim();
});

self.addEventListener("fetch", evt => {
  if (evt.request.method !== "GET") return;

  // Handle API requests with network-first strategy
  if (evt.request.url.includes('/chat') || evt.request.url.includes('/business/')) {
    evt.respondWith(
      fetch(evt.request)
        .then(response => {
          // Cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(evt.request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // Return cached version if available
          return caches.match(evt.request);
        })
    );
  } else {
    // Static assets: cache-first
    evt.respondWith(
      caches.match(evt.request).then(res => res || fetch(evt.request))
    );
  }
});
