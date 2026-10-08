/* Guarda la página en el aparato para que abra aunque no haya internet. */
var V = "kx-v1";
var CORE = ["./", "index.html", "sync.js", "vendor/supabase.js", "manifest.webmanifest", "icon-192.png"];
self.addEventListener("install", function(e){
  e.waitUntil(caches.open(V).then(function(c){ return c.addAll(CORE); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){ return k !== V; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener("fetch", function(e){
  var r = e.request;
  if(r.method !== "GET") return;
  var u = new URL(r.url);
  if(u.hostname.indexOf("supabase.co") >= 0) return;            /* la nube nunca se guarda en caché */
  e.respondWith(fetch(r).then(function(res){
    if(res && res.ok && (u.origin === location.origin || u.hostname.indexOf("fonts.g") === 0)){
      var cp = res.clone(); caches.open(V).then(function(c){ c.put(r, cp); });
    }
    return res;
  }).catch(function(){
    return caches.match(r).then(function(m){ return m || (r.mode === "navigate" ? caches.match("index.html") : undefined); });
  }));
});
