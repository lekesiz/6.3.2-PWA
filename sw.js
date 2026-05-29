/* ============================================================
 * Hôtel Belle Étoile — Service Worker
 * UE 6.3.2 PWA · Activité 2 · Mikail Lekesiz
 *
 * Stratégies :
 *   - Statiques (HTML/CSS/JS/icons) : cache-first
 *   - API (/api.php) : network-first avec fallback offline
 * ============================================================ */

const VERSION = 'v2.0.0';
const CACHE_STATIC = `hotel-static-${VERSION}`;
const CACHE_RUNTIME = `hotel-runtime-${VERSION}`;

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

/* ---------- Install : pré-cache des assets statiques ---------- */
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_STATIC)
            .then((cache) => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
            .catch((err) => console.warn('[SW] install error:', err))
    );
});

/* ---------- Activate : nettoie les anciens caches ---------- */
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys
                    .filter((key) => key !== CACHE_STATIC && key !== CACHE_RUNTIME)
                    .map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

/* ---------- Fetch ---------- */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // API : network-first
    if (url.pathname.endsWith('/api.php')) {
        event.respondWith(networkFirst(request));
        return;
    }

    // Navigation : network-first puis cache puis offline.html
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((res) => {
                    const copy = res.clone();
                    caches.open(CACHE_RUNTIME).then((c) => c.put(request, copy));
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

async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
        const res = await fetch(request);
        if (res.ok) {
            const cache = await caches.open(CACHE_RUNTIME);
            cache.put(request, res.clone());
        }
        return res;
    } catch (err) {
        return new Response('Hors ligne', { status: 503, statusText: 'Offline' });
    }
}

async function networkFirst(request) {
    try {
        const res = await fetch(request);
        return res;
    } catch (err) {
        return new Response(
            JSON.stringify({ success: false, error: 'Hors ligne — vérifiez votre connexion.' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
