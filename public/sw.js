const CACHE_NAME = 'mymoney-v2';
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

self.addEventListener('install', (event) => {
  self.skipWaiting(); // 즉시 활성화
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  // 이전 버전 캐기 삭제
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Network First 전략 적용
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 네트워크 성공 시 캐시 업데이트
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // 오프라인이거나 네트워크 실패 시 캐시 반환
        return caches.match(event.request);
      })
  );
});
