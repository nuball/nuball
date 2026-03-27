// v4
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

// data-only 메시지: payload.data에서 읽어서 직접 표시
messaging.onBackgroundMessage(payload => {
  const d = payload.data || {};
  const title = d.title || 'NUBALL ⚾';
  const options = {
    body: d.body || '오늘의 누볼이 기다리고 있어요! 지금 바로 플레이하세요 🎯',
    icon: d.icon || 'https://nuball.vercel.app/og-image.PNG',
    badge: 'https://nuball.vercel.app/og-image.PNG',
    tag: 'nuball-daily',
    renotify: false,
    data: { url: d.url || 'https://nuball.vercel.app' }
  };
  return self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data?.url || 'https://nuball.vercel.app'));
});
