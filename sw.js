/* PAW LEGENDS: DOG WORLD — service worker (cevrimdisi calisma)
   Yalnizca http(s) uzerinden servis edilirken kayit olur; file:// ile calismaz. */
var CACHE = "paw-legends-v7";
var CORE = ["./", "./index.html", "./manifest.webmanifest", "./src/css/style.css",
  "./src/js/core/data_bundle.js", "./src/js/core/engine.js", "./src/js/ui/ui.js",
  "./src/js/app.js", "./src/js/net.js", "./scenes/screens_core.js", "./scenes/screens_play.js"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE).catch(function () { }); })
    .then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  e.respondWith(caches.match(req).then(function (hit) {
    if (hit) return hit;
    return fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(req, copy).catch(function () { }); });
      return res;
    }).catch(function () { return caches.match("./index.html"); });
  }));
});
