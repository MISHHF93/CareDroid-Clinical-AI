/**
 * Service Worker for CareDroid
 *
 * Enables offline functionality through caching strategy:
 * - Cache-first for static assets
 * - Network-first for API calls with offline fallback
 * - Periodic API sync when connection restored
 */

const CACHE_NAME = 'caredroid-v5-static-shell';
const IS_LOCAL_DEV =
  self.location.hostname === 'localhost' ||
  self.location.hostname === '127.0.0.1' ||
  self.location.hostname === '[::1]';
const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/logo.svg',
  '/icon.svg',
  '/badge.svg',
  '/site.webmanifest',
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  if (IS_LOCAL_DEV) {
    event.waitUntil(self.skipWaiting());
    return;
  }

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caching app shell');
      return Promise.allSettled(APP_SHELL_URLS.map((url) => cache.add(url)));
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  if (IS_LOCAL_DEV) {
    event.waitUntil(
      caches
        .keys()
        .then((cacheNames) => Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName))))
        .then(() => self.registration.unregister())
        .then(() => self.clients.matchAll({ type: 'window' }))
        .then((clients) => {
          clients.forEach((client) => client.navigate(client.url));
        })
    );
    return;
  }

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
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
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  if (IS_LOCAL_DEV) {
    event.respondWith(fetch(request));
    return;
  }

  // Skip caching for API calls and external resources
  if (url.pathname.startsWith('/api')) {
    event.respondWith(networkFirstStrategy(request));
  } else if (request.mode === 'navigate') {
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
  return caches
    .match(request)
    .then((response) => {
      if (response) {
        return response;
      }

      return fetch(request).then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // Clone and cache successful responses
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });

        return response;
      });
    })
    .catch(() => {
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
  const networkRequest =
    request.mode === 'navigate' ? new Request(request, { cache: 'no-store' }) : request;

  return fetch(networkRequest)
    .then((response) => {
      // Cache successful responses
      if (response && response.status === 200) {
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
      }
      return response;
    })
    .catch(() => {
      // Fall back to cached version if network fails
      return caches.match(request).then((response) => {
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
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_CLIENT_ID') {
    event.ports[0].postMessage({ clientId: self.clientId });
  }
});

// Periodic sync for data synchronization (requires permission)
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', (event) => {
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
        timestamp: 0,
      }),
    });

    if (response.ok) {
      // Notify all clients of successful sync
      const clients = await self.clients.matchAll();
      clients.forEach((client) => {
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
  self.addEventListener('push', (event) => {
    const options = {
      body: event.data?.text() || 'New notification',
      icon: '/icon.svg',
      badge: '/badge.svg',
      vibrate: [100, 50, 100],
      tag: 'notification',
      requireInteraction: false,
    };

    event.waitUntil(self.registration.showNotification('CareDroid-Clinical-AI', options));
  });

  self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
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
