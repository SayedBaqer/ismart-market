// Bump this version string on every deploy that changes page content (translations,
// category data, etc). It's the only thing that makes the browser notice this file
// changed and install a fresh service worker — otherwise installed PWAs (especially
// iOS, which only checks for SW updates on a full close+reopen) can keep serving
// stale cached HTML for '/' and '/products' indefinitely, even after the site itself
// is fixed.
const CACHE = 'ismart-v3'
const STATIC = [
  '/',
  '/products',
  '/offline',
  '/manifest.json',
]

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(STATIC)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  const url = new URL(request.url)

  // Skip non-GET, cross-origin, and API requests → always use network
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/admin')
  ) {
    return
  }

  // Cache-first for static assets
  const isStatic = /\.(png|jpg|jpeg|svg|gif|webp|ico|woff2?|css|js)$/.test(url.pathname)

  if (isStatic) {
    e.respondWith(
      caches.match(request).then((cached) =>
        cached || fetch(request).then((res) => {
          const clone = res.clone()
          caches.open(CACHE).then((c) => c.put(request, clone))
          return res
        })
      )
    )
  } else {
    // Network-first for pages; fall back to offline page
    e.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone()
          caches.open(CACHE).then((c) => c.put(request, clone))
          return res
        })
        .catch(() => caches.match(request) || caches.match('/offline'))
    )
  }
})
