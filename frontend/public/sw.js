// Service Worker for PaySplit PWA

const CACHE_NAME = 'paysplit-v1'
const STATIC_CACHE_NAME = 'paysplit-static-v1'
const DYNAMIC_CACHE_NAME = 'paysplit-dynamic-v1'

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/ko',
  '/en',
  '/manifest.json',
  '/favicon.ico',
  '/pwa-192x192.png',
  '/pwa-512x512.png'
]

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Caching static files...')
        return cache.addAll(STATIC_FILES)
      })
      .then(() => {
        return self.skipWaiting()
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        return self.clients.claim()
      })
  )
})

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Handle navigation requests (for SPA routing)
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/')
        .then((response) => {
          return response || fetch(request)
        })
        .catch(() => {
          return caches.match('/')
        })
    )
    return
  }

  // Handle API requests - network first, then cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone()
            caches.open(DYNAMIC_CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseClone)
              })
          }
          return response
        })
        .catch(() => {
          return caches.match(request)
        })
    )
    return
  }

  // Handle static assets - cache first, then network
  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          return response
        }
        
        return fetch(request)
          .then((response) => {
            // Only cache successful responses
            if (response.status === 200) {
              const responseClone = response.clone()
              caches.open(DYNAMIC_CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseClone)
                })
            }
            return response
          })
      })
  )
})

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync:', event.tag)
  
  if (event.tag === 'upload-receipt') {
    event.waitUntil(uploadPendingReceipts())
  }
})

// Push notifications (for future implementation)
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event)
  
  const options = {
    body: event.data ? event.data.text() : 'PaySplit notification',
    icon: '/pwa-192x192.png',
    badge: '/pwa-64x64.png',
    tag: 'paysplit-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/pwa-192x192.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  }

  event.waitUntil(
    self.registration.showNotification('PaySplit', options)
  )
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.action)
  
  event.notification.close()

  if (event.action === 'view') {
    event.waitUntil(
      self.clients.openWindow('/')
    )
  }
})

// Helper function for background sync
async function uploadPendingReceipts() {
  try {
    // Get pending receipts from IndexedDB
    const pendingReceipts = await getPendingReceipts()
    
    for (const receipt of pendingReceipts) {
      try {
        // Attempt to upload
        const response = await fetch('/api/receipts/upload', {
          method: 'POST',
          body: receipt.formData
        })
        
        if (response.ok) {
          // Remove from pending list
          await removePendingReceipt(receipt.id)
          console.log('Receipt uploaded successfully:', receipt.id)
        }
      } catch (error) {
        console.error('Failed to upload receipt:', error)
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error)
  }
}

// IndexedDB helpers (simplified)
function getPendingReceipts() {
  return new Promise((resolve) => {
    // Implementation would use IndexedDB
    resolve([])
  })
}

function removePendingReceipt(id) {
  return new Promise((resolve) => {
    // Implementation would use IndexedDB
    resolve()
  })
}

// Handle app updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

console.log('PaySplit Service Worker loaded')