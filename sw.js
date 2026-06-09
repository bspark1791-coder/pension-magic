// 연금의 마술사 — Service Worker
const CACHE_NAME = 'pension-magic-v2';
const CACHE_URLS = ['/', '/index.html', '/manifest.json', '/icon.svg'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(CACHE_URLS).catch(() => {})
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // ✅ 이 경로들은 절대 캐싱하지 않고 항상 네트워크로
  const bypassPaths = [
    '/api/',
    '/api/auth/',
    '/api/auth/google',
    '/api/auth/callback',
  ];

  const shouldBypass = bypassPaths.some(p => url.pathname.startsWith(p))
    || url.pathname.includes('auth')
    || url.pathname.includes('google')
    || url.search.includes('auth=')
    || event.request.method !== 'GET';

  if (shouldBypass) {
    // 캐시 완전 우회 — 네트워크 직접 요청
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        if (event.request.destination === 'document') {
          return caches.match('/');
        }
      });
    })
  );
});
