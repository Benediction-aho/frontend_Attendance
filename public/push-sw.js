/* Push handlers loaded by the service worker. Payload: { kind, title, body, path, tag }. */
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' };
  }
  const title = typeof data.title === 'string' && data.title ? data.title : 'Attendance';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof data.body === 'string' ? data.body : '',
      tag: typeof data.tag === 'string' ? data.tag : undefined,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { path: data.path, kind: data.kind },
    }),
  );
});

/** Only in-app paths are opened ("/attendance" -> "/app/attendance"); never external URLs. */
function targetOf(data) {
  const byKind = { signup_request: '/app/admin/requests', checkin_reminder: '/app' };
  if (data && byKind[data.kind]) return byKind[data.kind];
  const p = data && typeof data.path === 'string' ? data.path : '';
  if (!p.startsWith('/') || p.startsWith('//') || p.includes('\\')) return '/app/notifications';
  return p === '/app' || p.startsWith('/app/') ? p : '/app' + p;
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(targetOf(event.notification.data), self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (new URL(c.url).origin === self.location.origin && 'focus' in c) {
          return c.focus().then((w) => (w && 'navigate' in w ? w.navigate(url) : w));
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
