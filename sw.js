/* ============================================================
 * Hôtel Belle Étoile — Service Worker
 * UE 6.3.2 PWA · Activité 3 · Mikail Lekesiz
 *
 * Fonctionnalités :
 *   - Cache statique (cache-first) + runtime (stale-while-revalidate)
 *   - Background Sync : tente de renvoyer les réservations stockées hors ligne
 *   - Notifications : push event + notificationclick
 * ============================================================ */

const VERSION = 'v3.0.0';
const CACHE_STATIC  = `hotel-static-${VERSION}`;
const CACHE_RUNTIME = `hotel-runtime-${VERSION}`;
const CACHE_IMAGES  = `hotel-images-${VERSION}`;
const MAX_RUNTIME   = 30;
const MAX_IMAGES    = 20;

const STATIC_ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './offline.html'
];

/* ============================================================
 * INSTALL
 * ============================================================ */
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_STATIC)
            .then((cache) => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
            .catch((err) => console.warn('[SW] install error:', err))
    );
});

/* ============================================================
 * ACTIVATE — nettoie les anciens caches
 * ============================================================ */
self.addEventListener('activate', (event) => {
    const keep = new Set([CACHE_STATIC, CACHE_RUNTIME, CACHE_IMAGES]);
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

/* ============================================================
 * FETCH — stratégies multiples
 * ============================================================ */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // API : network-first
    if (url.pathname.endsWith('/api.php')) {
        event.respondWith(networkFirst(request));
        return;
    }

    // Images : stale-while-revalidate
    if (request.destination === 'image' || /\.(png|jpe?g|gif|webp|svg)$/i.test(url.pathname)) {
        event.respondWith(staleWhileRevalidate(request, CACHE_IMAGES, MAX_IMAGES));
        return;
    }

    // Navigation : network-first, fallback cache puis offline.html
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((res) => {
                    const copy = res.clone();
                    caches.open(CACHE_RUNTIME).then((c) => {
                        c.put(request, copy);
                        trimCache(CACHE_RUNTIME, MAX_RUNTIME);
                    });
                    return res;
                })
                .catch(() => caches.match(request)
                    .then((cached) => cached || caches.match('./offline.html')))
        );
        return;
    }

    // Autres GET : cache-first
    event.respondWith(cacheFirst(request));
});

/* ---------- Stratégies ---------- */
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
        const res = await fetch(request);
        if (res.ok) {
            const cache = await caches.open(CACHE_RUNTIME);
            cache.put(request, res.clone());
            trimCache(CACHE_RUNTIME, MAX_RUNTIME);
        }
        return res;
    } catch (err) {
        return new Response('Hors ligne', { status: 503 });
    }
}

async function networkFirst(request) {
    try { return await fetch(request); }
    catch {
        return new Response(
            JSON.stringify({ success: false, error: 'Hors ligne — votre demande sera traitée à la reconnexion.' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

async function staleWhileRevalidate(request, cacheName, maxItems) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    const networkPromise = fetch(request)
        .then((res) => {
            if (res.ok) {
                cache.put(request, res.clone());
                trimCache(cacheName, maxItems);
            }
            return res;
        })
        .catch(() => null);
    return cached || (await networkPromise) || new Response('', { status: 503 });
}

async function trimCache(cacheName, maxItems) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
        for (let i = 0; i < keys.length - maxItems; i++) {
            await cache.delete(keys[i]);
        }
    }
}

/* ============================================================
 * BACKGROUND SYNC
 * Récupère les réservations stockées hors ligne dans IndexedDB
 * et les renvoie au serveur quand la connexion est rétablie.
 * ============================================================ */
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-reservations') {
        event.waitUntil(syncQueuedReservations());
    }
});

async function syncQueuedReservations() {
    const db = await openQueueDb();
    const tx = db.transaction('queue', 'readwrite');
    const store = tx.objectStore('queue');
    const items = await idbGetAll(store);

    for (const item of items) {
        try {
            const res = await fetch('api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item.payload)
            });
            const json = await res.json();
            if (json.success) {
                // Supprime l'élément de la file
                await idbDelete(db, 'queue', item.id);
                // Notification de succès
                await self.registration.showNotification('Réservation envoyée', {
                    body: `Code : ${json.code} (créée pour ${item.payload.nom})`,
                    icon: 'icons/icon-192.png',
                    badge: 'icons/icon-192.png',
                    tag: `reservation-${json.code}`,
                    data: { code: json.code },
                });
            }
        } catch (err) {
            // On laisse en file, le prochain sync ré-essaiera
            console.warn('[SW] sync retry needed:', err);
        }
    }
}

/* ---------- IndexedDB helpers (côté SW) ---------- */
function openQueueDb() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('belle-etoile-queue', 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('queue')) {
                db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}
function idbGetAll(store) {
    return new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
}
function idbDelete(db, storeName, id) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const req = tx.objectStore(storeName).delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

/* ============================================================
 * PUSH NOTIFICATIONS
 * Réagit aux push envoyés depuis un serveur (préparé pour V3+).
 * Localement, la page utilise registration.showNotification().
 * ============================================================ */
self.addEventListener('push', (event) => {
    let data = { title: 'Hôtel Belle Étoile', body: 'Notification' };
    try {
        if (event.data) data = { ...data, ...event.data.json() };
    } catch { /* texte simple */ }

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body:  data.body,
            icon:  'icons/icon-192.png',
            badge: 'icons/icon-192.png',
            tag:   data.tag || 'general',
            data:  data,
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((wins) => {
                for (const w of wins) {
                    if (w.url.includes('/6-3-2-pwa/')) {
                        w.focus();
                        return;
                    }
                }
                return clients.openWindow('./');
            })
    );
});
