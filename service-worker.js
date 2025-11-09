// service-worker.js
const VERSION = 'v1.0.0';
const STATIC_CACHE = `static-${VERSION}`;
const STATIC_ASSETS = [
  '/', '/index.html',
  '/js/i18n.js', '/js/common.js',
  '/i18n/en.json', '/i18n/zh.json',
  'https://unpkg.com/tailwindcss@2.2.19/dist/tailwind.min.css',
  'https://fonts.googleapis.com/css?family=Source+Sans+Pro:400,700'
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(STATIC_CACHE).then(c=>c.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k.startsWith('static-') && k!==STATIC_CACHE).map(k=>caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e=>{
  const { request } = e;
  // 只缓存 GET
  if(request.method !== 'GET') return;

  // i18n 与静态文件：Cache First
  if (request.url.includes('/i18n/') || request.url.endsWith('.css') || request.url.endsWith('.js')) {
    e.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(resp=>{
        const clone = resp.clone();
        caches.open(STATIC_CACHE).then(c=>c.put(request, clone));
        return resp;
      }))
    );
    return;
  }

  // 其他：Network First
  e.respondWith(
    fetch(request).then(resp=>{
      return resp;
    }).catch(()=> caches.match(request))
  );
});
