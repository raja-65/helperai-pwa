const CACHE_NAME = 'helperai-static-v1';
const FILES = ['/helperai-pwa/', '/helperai-pwa/index.html', '/helperai-pwa/manifest.json', '/helperai-pwa/logo.png'];

self.addEventListener('install', evt => {
  evt.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', evt => { clients.claim(); });

self.addEventListener('fetch', evt => {
  if (evt.request.mode === 'navigate') {
    evt.respondWith(caches.match('/helperai-pwa/index.html').then(res => res || fetch('/helperai-pwa/index.html')));
    return;
  }
  if (evt.request.method !== 'GET') return;
  evt.respondWith(caches.match(evt.request).then(res => res || fetch(evt.request)));
});
