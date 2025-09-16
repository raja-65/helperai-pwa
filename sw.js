// sw.js - Enhanced Service Worker for HelperAI PWA
const CACHE_NAME = 'helperai-v1.2';
const CACHE_URLS = [
  '/helperai-pwa/',
  '/helperai-pwa/index.html',
  '/helperai-pwa/business-login.html',
  '/helperai-pwa/dashboard.html',
  //'/helperai-pwa/style.css',
  '/helperai-pwa/manifest.json',
  '/helperai-pwa/logo.png',
  // Add your icon files
  '/helperai-pwa/icons/icon-192x192.png',
  '/helperai-pwa/icons/icon-512x512.png',
  // External dependencies (will be cached when first accessed)
  'https://checkout.razorpay.com/v1/checkout.js',
  'https://cdn.jsdelivr.net/npm/marked/marked.min.js'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching app shell');
        return cache.addAll(CACHE_URLS.map(url => new Request(url, { cache: 'reload' })));
      })
      .catch((error) => {
        console.error('Failed to cache resources:', error);
      })
  );
  
  // Force activation of new service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const requestURL = new URL(event.request.url);
  
  // Skip non-GET requests and chrome-extension requests
  if (event.request.method !== 'GET' || requestURL.protocol === 'chrome-extension:') {
    return;
  }
  
  // Handle API requests (always go to network, but cache successful responses)
  if (requestURL.origin.includes('execute-api') || requestURL.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request.clone())
        .then((response) => {
          // Cache successful API responses for offline fallback
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cached response if network fails
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // Handle app resources (cache-first strategy)
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Not in cache, fetch from network
        return fetch(event.request.clone())
          .then((networkResponse) => {
            // Cache successful responses
            if (networkResponse.ok) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch((error) => {
            console.error('Fetch failed:', error);
            
            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/helperai-pwa/index.html');
            }
            
            throw error;
          });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync-chat') {
    event.waitUntil(
      // Handle queued chat messages when back online
      handleOfflineChatMessages()
    );
  }
});

// Push notification handling (for future features)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'New notification from HelperAI',
      icon: '/helperai-pwa/icons/icon-192x192.png',
      badge: '/helperai-pwa/icons/icon-96x96.png',
      vibrate: [200, 100, 200],
      data: data.data || {},
      actions: [
        {
          action: 'open',
          title: 'Open App',
          icon: '/helperai-pwa/icons/icon-96x96.png'
        },
        {
          action: 'close',
          title: 'Dismiss'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'HelperAI', options)
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow('/helperai-pwa/')
    );
  }
});

// Message handling from main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Helper function to handle offline chat messages
async function handleOfflineChatMessages() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const offlineMessages = await cache.match('offline-messages');
    
    if (offlineMessages) {
      const messages = await offlineMessages.json();
      
      // Process each offline message
      for (const message of messages) {
        try {
          await fetch(message.url, {
            method: message.method,
            headers: message.headers,
            body: message.body
          });
        } catch (error) {
          console.error('Failed to sync message:', error);
        }
      }
      
      // Clear offline messages after syncing
      await cache.delete('offline-messages');
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Utility function to show offline notification
function showOfflineNotification() {
  if (Notification.permission === 'granted') {
    new self.Notification('HelperAI - Offline', {
      body: 'You are now offline. Some features may be limited.',
      icon: '/helperai-pwa/icons/icon-192x192.png',
      silent: true
    });
  }
}

// Network status monitoring
self.addEventListener('online', () => {
  console.log('App is back online');
});

self.addEventListener('offline', () => {
  console.log('App is offline');
  showOfflineNotification();
});