// /service-worker.js

const CACHE_NAME = "huoban-cache-v1.1";

const urlsToCache = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.json",
  "./font-awesome/css/all.min.css",

  // 外部 CDN 資源
  "https://unpkg.com/vue@3/dist/vue.global.js",
  "https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js",
  "https://cdn.tailwindcss.com",
  "https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap",
];

self.addEventListener("install", (event) => {
  // 跳過等待，讓新的 Service Worker 立即啟用
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Service Worker: Caching app shell.");
      const cachePromises = urlsToCache.map((urlToCache) => {
        const isExternal = urlToCache.startsWith("http");
        const request = new Request(
          urlToCache,
          isExternal ? { mode: "no-cors" } : {}
        );
        return fetch(request)
          .then((response) => {
            if (response.status === 200 || response.type === "opaque") {
              return cache.put(urlToCache, response);
            }
            console.warn(
              `Skipping caching for ${urlToCache}. Status: ${response.status}`
            );
          })
          .catch((err) => {
            console.error(`Failed to fetch and cache ${urlToCache}`, err);
          });
      });
      return Promise.all(cachePromises);
    })
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  // 讓所有 JS 檔案請求直接通過網路，以確保總是獲取最新邏輯
  if (request.url.endsWith(".js")) {
    return;
  }

  if (
    request.url.includes("firestore.googleapis.com") ||
    request.url.includes("fonts.gstatic.com") ||
    request.url.endsWith("manifest.json")
  ) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        if (
          networkResponse &&
          (networkResponse.status === 200 || networkResponse.type === "opaque")
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});

self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log("Service Worker: Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
