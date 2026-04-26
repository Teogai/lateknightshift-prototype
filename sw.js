const CACHE_NAME = 'lks-v1';
const ASSETS = [
  './',
  './index.html',
  './css/base.css',
  './css/board.css',
  './css/cards.css',
  './css/map.css',
  './css/room.css',
  './css/enemy.css',
  './css/screens.css',
  './css/modals.css',
  './css/responsive.css',
  './css/piece-detail.css',
  './css/relics.css',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});
