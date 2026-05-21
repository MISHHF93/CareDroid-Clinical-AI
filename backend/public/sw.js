/**
 * Service Worker for CareDroid
 * 
 * Enables offline functionality through caching strategy:
 * - Cache-first for static assets
 * - Network-first for API calls with offline fallback
 * - Periodic API sync when connection restored
 */

const CACHE_NAME = 'caredroid-v3-with-sidebar';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/main.js',
];

// Install event - cache essential files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Service Worker: Caching app shell');
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip caching for API calls and external resources
  if (url.pathname.startsWith('/api')) {
    event.respondWith(networkFirstStrategy(request));
  } else {
    event.respondWith(cacheFirstStrategy(request));
  }
});

/**
 * Cache-first strategy for static assets
 * Tries cache first, falls back to network
 */
function cacheFirstStrategy(request) {
  return caches.match(request).then(response => {
    if (response) {
      return response;
    }

    return fetch(request).then(response => {
      // Don't cache non-successful responses
      if (!response || response.status !== 200 || response.type === 'error') {
        return response;
      }

      // Clone and cache successful responses
      const responseToCache = response.clone();
      caches.open(CACHE_NAME).then(cache => {
        cache.put(request, responseToCache);
      });

      return response;
    });
  }).catch(() => {
    // Return offline fallback if both cache and network fail
    return new Response('Offline - Resource not available', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({ 'Content-Type': 'text/plain' }),
    });
  });
}

/**
 * Network-first strategy for API calls
 * Tries network first, falls back to cache
 */
function networkFirstStrategy(request) {
  return fetch(request)
    .then(response => {
      // Cache successful responses
      if (response && response.status === 200) {
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, responseToCache);
        });
      }
      return response;
    })
    .catch(() => {
      // Fall back to cached version if network fails
      return caches.match(request).then(response => {
        if (response) {
          return response;
        }

        // If no cache, notify client of offline status
        return new Response(
          JSON.stringify({
            error: 'Offline',
            message: 'Network request failed and no cached response available',
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      });
    });
}

// Handle messages from clients
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_CLIENT_ID') {
    event.ports[0].postMessage({ clientId: self.clientId });
  }
});

// Periodic sync for data synchronization (requires permission)
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', event => {
    if (event.tag === 'sync-data') {
      event.waitUntil(syncDataWithServer());
    }
  });
}

/**
 * Sync pending data with server
 */
async function syncDataWithServer() {
  try {
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: localStorage.getItem('lastSyncTime') || 0,
      }),
    });

    if (response.ok) {
      localStorage.setItem('lastSyncTime', Date.now());
      
      // Notify all clients of successful sync
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'SYNC_SUCCESS',
          timestamp: Date.now(),
        });
      });
    }
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

// Push notifications
if ('PushManager' in self) {
  self.addEventListener('push', event => {
    const options = {
      body: event.data?.text() || 'New notification',
      icon: '/icon.png',
      badge: '/badge.png',
      vibrate: [100, 50, 100],
      tag: 'notification',
      requireInteraction: false,
    };

    event.waitUntil(
      self.registration.showNotification('CareDroid-Clinical-AI', options)
    );
  });

  self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        for (let i = 0; i < clientList.length; i++) {
          return clientList[i].focus();
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  });
}
