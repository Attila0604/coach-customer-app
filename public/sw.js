// Minimaler Service-Worker: macht die App installierbar (Android-Dialog) und
// app-tauglich – cached aber NUR statische Assets, niemals Seiten/API/Kundendaten,
// damit nie veraltete Inhalte angezeigt werden.
const STATIC_CACHE = "rgym-static-v1";
const STATIC_ASSETS = [
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
  "/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Nur eigene statische Assets cache-first bedienen.
  if (
    url.origin === self.location.origin &&
    STATIC_ASSETS.includes(url.pathname)
  ) {
    event.respondWith(caches.match(req).then((cached) => cached || fetch(req)));
    return;
  }
  // Alles andere (Seiten, API, Supabase) bleibt unangetastet -> immer frisch.
});
