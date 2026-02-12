const CACHE_NAME = 'json-viewer-v3';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json'
];

// install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  if (!event.request.url.startsWith('http')) return;
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
  );
});
