/* 
 * Service Worker — Approval Anywhere PWA
 * Handles offline static caching and Web Push Notifications
 */

const CACHE_NAME = 'mci-approve-v11.0.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/biometric.js',
  './js/pwa-install.js',
  './manifest.json',
  './assets/logo.png',
  './assets/logo-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install Event — Cache Core Static Assets
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Installing PWA Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[ServiceWorker] Caching static app shell...');
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[ServiceWorker] Cache addAll warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event — Clean Old Caches
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activating PWA Service Worker...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => {
          console.log('[ServiceWorker] Removing old cache:', key);
          return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event — Cache First, Network Fallback
self.addEventListener('fetch', event => {
  // Only handle GET requests and skip API requests
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Return cached asset, update cache in background
        fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse));
          }
        }).catch(() => {/* Offline fallback */});
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});

// Push Notification Event — Show Web Push Alert on Smartphone
self.addEventListener('push', event => {
  console.log('[ServiceWorker] Web Push Notification Received:', event);

  let data = {
    title: '🔔 Otorisasi BPRS HIK MCI',
    body: 'Ada permohonan otorisasi baru membutuhkan persetujuan Anda.',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    url: './index.html'
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || 'icons/icon-192.png',
    badge: data.badge || 'icons/icon-192.png',
    vibrate: [200, 100, 200, 100, 200],
    data: { url: data.url || './index.html' },
    actions: [
      { action: 'open', title: '👁️ Buka Otorisasi' },
      { action: 'close', title: 'Tutup' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification Click Event — Open PWA Window
self.addEventListener('notificationclick', event => {
  console.log('[ServiceWorker] Notification clicked:', event);
  event.notification.close();

  if (event.action === 'close') return;

  const targetUrl = new URL(event.notification.data.url || './index.html', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (let client of windowClients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
