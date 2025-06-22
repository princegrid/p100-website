const CACHE_NAME = 'p100-images-v1';
const STATIC_CACHE_NAME = 'p100-static-v1';

// URLs to cache on install
const STATIC_URLS_TO_CACHE = [
  '/homepage.png',
  '/killerpage.png',
  '/survivorpage.png',
  '/search.png',
  '/p100submissions.png',
  '/admin.png',
  '/favicon.ico'
];

// External domains we want to cache
const EXTERNAL_DOMAINS = [
  'ddejzyoxrbccpickqakz.supabase.co',
  'images.unsplash.com',
  'images.pexels.com'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_URLS_TO_CACHE);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete old cache versions
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Only cache GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle image requests
  if (request.destination === 'image' || 
      url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
    
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(request).then(cachedResponse => {
          if (cachedResponse) {
            // Return cached version immediately
            return cachedResponse;
          }

          // If it's an external image, try to fetch and cache it
          if (EXTERNAL_DOMAINS.some(domain => url.hostname.includes(domain))) {
            return fetch(request).then(response => {
              // Only cache successful responses
              if (response.status === 200) {
                // Clone the response to cache it
                const responseToCache = response.clone();
                cache.put(request, responseToCache);
              }
              return response;
            }).catch(() => {
              // Return a placeholder or nothing if the image fails to load
              console.log('Failed to fetch image:', request.url);
              return new Response('', { status: 404 });
            });
          }

          // For local images, just fetch normally
          return fetch(request);
        });
      })
    );
  }

  // Handle static assets
  else if (url.origin === self.location.origin && 
           STATIC_URLS_TO_CACHE.includes(url.pathname)) {
    
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        return cachedResponse || fetch(request);
      })
    );
  }
});

// Listen for messages from the main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'PRELOAD_IMAGES') {
    const imageUrls = event.data.urls;
    
    caches.open(CACHE_NAME).then(cache => {
      const promises = imageUrls.map(url => {
        return fetch(url).then(response => {
          if (response.status === 200) {
            return cache.put(url, response);
          }
        }).catch(error => {
          console.log('Failed to preload image:', url, error);
        });
      });
      
      return Promise.all(promises);
    }).then(() => {
      // Notify the main thread that preloading is complete
      event.ports[0].postMessage({ type: 'PRELOAD_COMPLETE' });
    });
  }
});
