// Service Worker Optimizado para MyTurn
const CACHE_NAME = 'myturn-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/logo-myturn.png',
  '/manifest.json'
];

// Instalación: Cachear activos básicos y forzar activación
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activación: Limpiar caches antiguos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// Estrategia de Fetch: Network First para HTML, Cache First para lo demás
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Para el HTML principal, siempre intentar red primero
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/');
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
