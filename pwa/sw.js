/*
 * Bir İşlem service worker'ı: oyun çevrimdışı da açılsın, uygulama mağaza
 * paketlerinde (TWA / WKWebView) anında yüklensin.
 *
 * Bu dosya olduğu gibi yayınlanmaz: derlemede vite.config.ts içindeki eklenti
 * başına self.__VERSION ve self.__PRECACHE değerlerini ekleyip build/sw.js yazar.
 */
const CACHE = `birislem-${self.__VERSION}`;
const RUNTIME = `birislem-rt-${self.__VERSION}`;
const PRECACHE = self.__PRECACHE;
const SHELL = '/index.html';
/** Ağ bu süreden uzun sürerse sayfa önbellekten açılır */
const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k.startsWith('birislem-') && k !== CACHE && k !== RUNTIME).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Firebase, Google ve diğer sitelere dokunma; giriş sayfaları (/__/auth) da ağdan gelsin
  if (url.origin !== self.location.origin || url.pathname.startsWith('/__/')) return;
  if (req.mode === 'navigate') {
    event.respondWith(page(req));
  } else if (url.pathname.startsWith('/assets/') || PRECACHE.includes(url.pathname)) {
    event.respondWith(cacheFirst(req));
  }
});

/** Sayfa: güncel sürüm için önce ağ; ağ yoksa ya da çok yavaşsa önbellekteki uygulama */
async function page(req) {
  try {
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT_MS);
      fetch(req).then(
        (res) => {
          clearTimeout(timer);
          resolve(res);
        },
        (err) => {
          clearTimeout(timer);
          reject(err);
        },
      );
    });
  } catch {
    return (await caches.match(SHELL)) || Response.error();
  }
}

/** Adı içeriğine göre değişen dosyalar: önbellekte varsa ağa hiç gitme */
async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) {
    const cache = await caches.open(RUNTIME);
    cache.put(req, res.clone());
  }
  return res;
}
