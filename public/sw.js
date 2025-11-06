self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open('kreativium-v1');
    await cache.addAll([
      '/',
      '/index.html',
    ]);
  })());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Cache-first for models and static assets
  if (url.pathname.startsWith('/models/') || url.pathname.match(/\.(js|css|png|jpg|svg|webp)$/)) {
    event.respondWith((async () => {
      const cache = await caches.open('kreativium-v1');
      const cached = await cache.match(event.request);
      if (cached) return cached;
      try {
        const resp = await fetch(event.request);
        if (resp && resp.ok) cache.put(event.request, resp.clone());
        return resp;
      } catch (e) {
        return cached || new Response('Offline', { status: 503 });
      }
    })());
  }
});




