/* RFL Service Worker - basic offline + runtime caching */
const VERSION = 'v1';
const CACHE_PAGES = `rfl-pages-${VERSION}`;
const CACHE_ASSETS = `rfl-assets-${VERSION}`;

const PRECACHE_URLS = [
  '/',
  '/offline',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_PAGES);
      // Be tolerant: missing routes should not prevent SW from installing.
      await Promise.all(
        PRECACHE_URLS.map((u) =>
          cache.add(u).catch(() => null)
        )
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => ![CACHE_PAGES, CACHE_ASSETS].includes(k)).map(k => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

function isAssetRequest(req) {
  const url = new URL(req.url);
  if (url.pathname.startsWith('/_next/')) return false;
  return (
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.ttf') ||
    url.pathname.endsWith('.otf') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.svg')
  );
}

function isSupabaseStorage(url) {
  return /supabase\.co\/.+\/storage\//.test(url);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Never interfere with Next.js internal assets or API routes.
  try {
    const u = new URL(req.url);
    if (u.origin === self.location.origin) {
      if (u.pathname.startsWith('/_next/') || u.pathname.startsWith('/api/')) return;
    }
  } catch {
    // ignore
  }

  // Navigations: network-only (never cache HTML pages to prevent cross-session data leaks)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/offline') || new Response('Offline', { status: 503 }))
    );
    return;
  }

  const url = req.url;
  // Assets: stale-while-revalidate
  if (isAssetRequest(req)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_ASSETS);
      const cached = await cache.match(req);
      const fetchPromise = fetch(req).then((res) => {
        cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })());
    return;
  }

  // Supabase Storage images: cache-first
  if (isSupabaseStorage(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_ASSETS);
      const cached = await cache.match(req);
      if (cached) return cached;
      const res = await fetch(req);
      cache.put(req, res.clone());
      return res;
    })());
    return;
  }
});


