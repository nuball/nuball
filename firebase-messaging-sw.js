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

// 백그라운드 메시지 수신
messaging.onBackgroundMessage(payload => {
  const {title, body, icon} = payload.notification || {};
  self.registration.showNotification(title || 'NUBALL ⚾', {
    body: body || '오늘의 누볼 도전이 기다리고 있어요!',
    icon: icon || '/og-image.PNG',
    badge: '/og-image.PNG',
    tag: 'nuball-daily',
    renotify: true,
    data: { url: 'https://nuball.vercel.app' }
  });
});

// 알림 클릭 시 앱 열기
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data?.url || 'https://nuball.vercel.app'));
});
