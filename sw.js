/* --- Service Worker --- */

// Назва нашого кешу. Зміни v1 на v2, v3 і т.д., коли треба повністю оновити кеш
const CACHE_NAME = 'schedule-cache-v2.0271';

// Список файлів, які треба завантажити в кеш "наперед"
// Це "оболонка" твого додатку
const FILES_TO_CACHE = [
    './', // Головна сторінка (index.html)
    'index.html',
    'style.css',
    'script.js',
    'editor.html', // Додаємо редактор, щоб він теж працював офлайн
    'editor.css',
    'editor.js',
    'image/Donat.jpg', // Додаємо картинку донату в кеш
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap' // Шрифти
];

// 1. Етап "Встановлення" (Install)
// Спрацьовує, коли Service Worker встановлюється вперше.
// Ми завантажуємо всі файли "оболонки" в кеш.
self.addEventListener('install', (event) => {
    console.log('[SW] Встановлення...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Кешування оболонки додатку...');
            return cache.addAll(FILES_TO_CACHE);
        })
    );
});

// 2. Етап "Активації" (Activate)
// Спрацьовує після встановлення. Тут ми можемо почистити старі кеші.
self.addEventListener('activate', (event) => {
    console.log('[SW] Активація...');
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                // Видаляємо всі кеші, крім поточного (CACHE_NAME)
                if (key !== CACHE_NAME) {
                    console.log('[SW] Видалення старого кешу:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim();
});

// 3. Етап "Перехоплення запитів" (Fetch)
// Спрацьовує КОЖЕН раз, коли сайт намагається щось завантажити (CSS, JS, JSON, картинки).
self.addEventListener('fetch', (event) => {

    // === СТРАТЕГІЯ ДЛЯ РОЗКЛАДУ (schedule.json) ===
    // "Network First" (Спочатку Мережа)
    // Це те, що ти просив:
    // 1. Намагаємось взяти з інтернету.
    // 2. Якщо вдалося - кладемо в кеш і віддаємо.
    // 3. Якщо не вдалося (офлайн) - дістаємо з кешу.
    if (event.request.url.includes('schedule.json')) {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return fetch(event.request)
                    .then((response) => {
                        // Якщо ми ОНЛАЙН і запит успішний
                        console.log('[SW] Завантажено новий schedule.json з мережі');
                        cache.put(event.request, response.clone()); // Кладемо свіжу копію в кеш
                        return response; // Віддаємо свіжу копію на сторінку
                    })
                    .catch(() => {
                        // Якщо ми ОФЛАЙН (fetch не вдався)
                        console.log('[SW] Немає мережі, дістаємо schedule.json з кешу');
                        return cache.match(event.request); // Дістаємо з кешу
                    });
            })
        );
        return; // Важливо вийти з функції тут
    }

    // === СТРАТЕГІЯ ДЛЯ ВСІХ ІНШИХ ФАЙЛІВ (CSS, JS, HTML) ===
    // "Cache First" (Спочатку Кеш)
    // 1. Шукаємо в кеші.
    // 2. Якщо є - миттєво віддаємо (це робить сайт супер-швидким і офлайновим).
    // 3. Якщо в кеші немає - вантажимо з інтернету.
    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) {
                // Знайдено в кеші
                // console.log('[SW] Файл знайдено в кеші:', event.request.url);
                return response;
            }

            // Не знайдено в кеші, йдемо в мережу
            // console.log('[SW] Файл не знайдено в кеші, вантажимо з мережі:', event.request.url);
            return fetch(event.request);
        })
    );
});
// 4. Етап "Повідомлення" (Message)
// Слухаємо команди з головного скрипту (script.js)
self.addEventListener('message', (event) => {
    // Якщо команда - 'SKIP_WAITING', то ми негайно активуємось
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('[SW] Отримано команду SKIP_WAITING. Активуємось!');
        self.skipWaiting();
    }
});
