const CACHE_NAME = "helperai-static-v1";
const FILES = ["index.html", "manifest.json", "logo.png"];

self.addEventListener("install", evt => {
  evt.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", evt => {
  clients.claim();
});

self.addEventListener("fetch", evt => {
  if (evt.request.method !== "GET") return;
  evt.respondWith(
    caches.match(evt.request).then(res => res || fetch(evt.request))
  );
});
