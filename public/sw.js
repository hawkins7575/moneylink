const CACHE_NAME = 'mymoney-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/data.js',
  '/js/main.js',
  '/js/state.js',
  '/js/dom.js',
  '/js/ui.js',
  '/js/api.js',
  '/js/auth.js',
  '/favicon.png',
  '/manifest.json'
];

// 서비스 워커 설치 및 캐싱
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// 캐시 응답
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
