// 서비스워커 완전 비활성화 — 모든 캐시 삭제
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});
// fetch 이벤트 핸들러 없음 = 모든 요청 네트워크 직접 처리
