// Minimal service worker to support notifications and receive postMessage/push.
// Register this at root ("/service-worker.js") and ensure your site is served over HTTPS for SW + notifications.

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  self.clients.claim();
});

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data.json(); } catch (e) { data = { title: 'Reminder', body: event.data.text() }; }
  const title = data.title || 'Reminder';
  const options = { body: data.body || '', tag: data.tag || 'focus-reminder' };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      if (clients && clients.length) {
        clients[0].focus();
      } else {
        self.clients.openWindow('/');
      }
    })
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'show-notification') {
    const { title, body } = event.data;
    self.registration.showNotification(title, { body });
  }
});