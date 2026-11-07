// Briefhulp service worker: maakt de app installeerbaar en laat hem offline werken.
// Strategie: pagina's eerst via het netwerk (altijd de nieuwste versie), anders uit de cache.
// Vaste bestanden (/_next/static, /vendor, iconen) uit de cache: die veranderen niet.
// Er worden NOOIT brieven, foto's of API-antwoorden bewaard.
const VERSION = "briefhulp-v1";
const SHELL = ["/", "/privacy", "/over", "/manifest.webmanifest", "/icon.svg", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // nooit cachen

  const immutable = url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/vendor/") || /\.(png|svg|woff2)$/.test(url.pathname);
  if (immutable) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone()));
            return res;
          }),
      ),
    );
    return;
  }

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match("/"))),
    );
  }
});
