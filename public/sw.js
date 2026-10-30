// DonDomi Lightweight Multi-App PWA Service Worker
// Designed to enable native PWA installation on Android/Chrome for /, /merchant, /driver, and /admin
// while NEVER intercepting or caching Supabase REST / Realtime traffic.

const CACHE_NAME = 'dondomi-pwa-v2';
const PRECACHE_ASSETS = [
  '/manifest-client.json',
  '/manifest-merchant.json',
  '/manifest-driver.json',
  '/manifest-admin.json',
  '/icons/icon-client-192.png',
  '/icons/icon-client-512.png',
  '/icons/icon-client.svg',
  '/icons/icon-merchant-192.png',
  '/icons/icon-merchant-512.png',
  '/icons/icon-merchant.svg',
  '/icons/icon-driver-192.png',
  '/icons/icon-driver-512.png',
  '/icons/icon-driver.svg',
  '/icons/icon-admin-192.png',
  '/icons/icon-admin-512.png',
  '/icons/icon-admin.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Jamás interceptar tráfico externo (ej. Supabase REST / Realtime), ni rutas de API o _next/webpack-hmr
  if (
    url.origin !== self.location.origin ||
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/_next/webpack-hmr') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // Estrategia Network-First ligera para cumplir requisitos de instalabilidad PWA en Android
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then((cached) => cached || Response.error())
    )
  );
});
