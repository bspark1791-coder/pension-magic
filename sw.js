// 연금의 마술사 — Service Worker
// 오프라인에서도 앱이 열리도록 캐싱

const CACHE_NAME = 'pension-magic-v1';
const CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// 설치 — 핵심 파일 캐싱
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('캐시 설치 중...');
      return cache.addAll(CACHE_URLS).catch(err => {
        console.warn('일부 파일 캐싱 실패:', err);
      });
    })
  );
  self.skipWaiting();
});

// 활성화 — 이전 캐시 삭제
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// fetch — 캐시 우선, 없으면 네트워크
self.addEventListener('fetch', event => {
  // API 요청은 항상 네트워크로
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // 유효한 응답만 캐싱
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, clone);
        });
        return response;
      }).catch(() => {
        // 오프라인 + 캐시 없음 → 메인 페이지 반환
        if (event.request.destination === 'document') {
          return caches.match('/');
        }
      });
    })
  );
});

// 푸시 알림 (나중에 확장 가능)
self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  self.registration.showNotification(data.title || '연금의 마술사', {
    body: data.body || '새 알림이 있습니다',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
  });
});
