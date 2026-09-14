/* 26商英2 课表 · Service Worker：离线缓存 + 可安装
   页面导航走「网络优先」，保证每次上线都能拿到新版；断网时回退到缓存副本。
   跨域请求(天气接口)不拦截，失败由页面自己提示。 */
const VER = 'sy2-553ceaae1c';
const BASE = new URL('./', self.location).href;
const SHELL = [BASE, BASE + 'index.html', BASE + 'manifest.webmanifest',
               BASE + 'icon-192.png', BASE + 'icon-512.png', BASE + 'apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VER).then(function (c) { return c.addAll(SHELL); })
    .then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.map(function (k) { return k === VER ? null : caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') { return; }
  if (new URL(req.url).origin !== self.location.origin) { return; }

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(function (res) {
      const c1 = res.clone(), c2 = res.clone();
      caches.open(VER).then(function (c) { c.put(BASE, c1); c.put(BASE + 'index.html', c2); });
      return res;
    }).catch(function () {
      return caches.match(req).then(function (r) { return r || caches.match(BASE + 'index.html'); });
    }));
    return;
  }

  e.respondWith(caches.match(req).then(function (hit) {
    const net = fetch(req).then(function (res) {
      if (res && res.status === 200 && res.type === 'basic') {
        const copy = res.clone();
        caches.open(VER).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () { return hit; });
    return hit || net;
  }));
});
