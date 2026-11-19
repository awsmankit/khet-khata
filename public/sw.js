// Khet Khata service worker: keeps the app usable on weak or no connectivity.
// Pages: network first, falling back to the cached shell. Built assets and fonts:
// cache first. Map tiles are cached as they are viewed, up to a limit.
// The app registers this file as sw.js?v=<app version>, so each release gets a fresh cache.
const APP_VERSION = new URL(self.location.href).searchParams.get('v') || 'dev'
const VERSION = `khet-khata-${APP_VERSION}`
const BASE = new URL('./', self.location.href).pathname
const SHELL = [BASE, `${BASE}manifest.webmanifest`, `${BASE}icons/icon-192.png`, `${BASE}icons/apple-touch-icon.png`]
const TILE_CACHE = 'khet-khata-tiles'
const TILE_LIMIT = 400

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== VERSION && key !== TILE_CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()))
})

async function trimTiles() {
  const cache = await caches.open(TILE_CACHE)
  const keys = await cache.keys()
  for (let index = 0; index < keys.length - TILE_LIMIT; index += 1) await cache.delete(keys[index])
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => {
      const copy = response.clone()
      caches.open(VERSION).then((cache) => cache.put(BASE, copy))
      return response
    }).catch(() => caches.match(BASE)))
    return
  }

  if (url.hostname.endsWith('tile.openstreetmap.org')) {
    event.respondWith(caches.open(TILE_CACHE).then(async (cache) => {
      const hit = await cache.match(request)
      if (hit) return hit
      const response = await fetch(request)
      if (response.ok || response.type === 'opaque') { cache.put(request, response.clone()); trimTiles() }
      return response
    }))
    return
  }

  const cacheable = url.origin === self.location.origin || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'
  if (!cacheable) return
  event.respondWith(caches.match(request).then((hit) => hit || fetch(request).then((response) => {
    if (response.ok || response.type === 'opaque') {
      const copy = response.clone()
      caches.open(VERSION).then((cache) => cache.put(request, copy))
    }
    return response
  })))
})
