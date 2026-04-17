// v5
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');
firebase.initializeApp({
  apiKey: "AIzaSyBN1kTHhl5auS5Aq_puyVx1l-rqYEXAkTw",
  authDomain: "nuball.firebaseapp.com",
  databaseURL: "https://nuball-default-rtdb.firebaseio.com",
  projectId: "nuball",
  storageBucket: "nuball.firebasestorage.app",
  messagingSenderId: "1097850287054",
  appId: "1:1097850287054:web:33d0b0c26c1ea50493719f"
});
const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const d = payload.data || {};
  const title = d.title || 'NUBALL ⚾';
  const body = d.body || '누볼 알림이 도착했어요!';
  const options = {
    body: body,
    icon: d.icon || 'https://nuball.app/og-image.PNG',
    badge: 'https://nuball.app/og-image.PNG',
    tag: 'nuball-' + Date.now(),
    renotify: true,
    data: { url: d.url || 'https://nuball.app' }
  };
  return self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data?.url || 'https://nuball.app'));
});
