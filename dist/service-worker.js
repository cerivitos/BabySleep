var cacheName = "babysleep-cache" + Date.now();
var filesToCache = [
  "/",
  "/index.html",
  "/main.css",
  "/main.js",
  "/components.css",
  "https://fonts.googleapis.com/css?family=Roboto|Lobster&display=swap",
  "https://apis.google.com/js/api.js"
];
self.addEventListener("install", function(e) {
  e.waitUntil(
    caches.open(cacheName).then(function(cache) {
      return cache.addAll(filesToCache);
    })
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(thisCacheName) {
          if (thisCacheName !== cacheName) {
            return caches.delete(thisCacheName);
          }
        })
      );
    })
  );
});

self.addEventListener("fetch", function(event) {
  event.respondWith(
    fetch(event.request).catch(function() {
      return caches.match(event.request);
    })
  );
});
