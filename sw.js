// sw.js - Автономний офлайн-режим (Stale-While-Revalidate)
const CACHE_NAME = 'aulinks-cache-v2.03';

// Використовуємо ТІЛЬКИ відносні шляхи для GitHub Pages
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './schedule.json',
  './manifest.json',
  './icon.svg',
  './editor.html',
  './editor.css',
  './editor.js'
];

// 1. Установка: кешуємо всі базові файли
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Активація: очищення старих кешів
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Перехоплення запитів: Автономна робота (Offline-First)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Папку /live/ (де лежать version.json та schedule_live.json) НЕ кешуємо в офлайн-кеш,
  // щоб перевірка оновлень завжди зверталася до актуальної версії
  if (url.pathname.includes('/live/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Для решти сайту: спочатку МИТТЄВО віддаємо з кешу, а у фоні оновлюємо кеш
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Мережа недоступна — якщо немає і в кеші, віддаємо головну сторінку
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });

      return cachedResponse || fetchPromise;
    })
  );
});
