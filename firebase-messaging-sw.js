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

// data-only 메시지 수신 → 직접 알림 표시 (사진 포함)
messaging.onBackgroundMessage(payload => {
  const data = payload.data || {};
  self.registration.showNotification(data.title || 'NUBALL ⚾', {
    body: data.body || '오늘의 누볼이 기다리고 있어요! 지금 바로 플레이하세요 🎯',
    icon: data.icon || 'https://nuball.vercel.app/og-image.PNG',
    image: data.icon || 'https://nuball.vercel.app/og-image.PNG',
    badge: 'https://nuball.vercel.app/og-image.PNG',
    tag: 'nuball-daily',
    renotify: true,
    data: { url: data.url || 'https://nuball.vercel.app' }
  });
});

// 알림 클릭 시 앱 열기
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data?.url || 'https://nuball.vercel.app'));
});
