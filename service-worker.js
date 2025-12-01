const CACHE_NAME = "step-resonance-cache-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./background-worker.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});

self.addEventListener("message", (event) => {
  const { type } = event.data || {};

  if (!self.registration.periodicSync) {
    return;
  }

  if (type === "registerPeriodicSync") {
    event.waitUntil(
      self.registration.periodicSync
        .register("step-sync", { minInterval: 30 * 60 * 1000 })
        .catch((error) => console.warn("Periodic sync registration failed", error))
    );
  }

  if (type === "unregisterPeriodicSync") {
    event.waitUntil(
      self.registration.periodicSync
        .unregister("step-sync")
        .catch((error) => console.warn("Periodic sync unregister failed", error))
    );
  }
});

self.addEventListener("periodicsync", (event) => {
  if (event.tag !== "step-sync") {
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => client.postMessage({ type: "backgroundSync" }));
    })
  );
});
