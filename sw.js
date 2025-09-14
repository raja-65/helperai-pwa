const STATIC_FILES = ["index.html", "manifest.json", "logo.png", "style.css", "about.html", "contact.html", "privacy.html", "pricing.html", "refund.html", "shipping.html", "terms.html"];

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
const CACHE_NAME = 'helperai-static-v1';
const FILES = ['/', '/helperai-pwa/index.html', '/helperai-pwa/manifest.json', '/helperai-pwa/logo.png'];

self.addEventListener('install', evt => {
  evt.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', evt => { clients.claim(); });

self.addEventListener('fetch', evt => {
  // navigation fallback for SPA and start_url
  if (evt.request.mode === 'navigate') {
    evt.respondWith(
      caches.match('/helperai-pwa/index.html').then(res => res || fetch('/helperai-pwa/index.html'))
    );
    return;
  }
  if (evt.request.method !== 'GET') return;
  evt.respondWith(caches.match(evt.request).then(res => res || fetch(evt.request)));
});
