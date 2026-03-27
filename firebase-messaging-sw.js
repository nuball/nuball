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

// notification 필드가 있으면 FCM이 자동 표시 + SW도 실행됨
// tag:'nuball-daily' + renotify:false 로 중복 방지
messaging.onBackgroundMessage(payload => {
  // notification 필드가 있으면 FCM이 이미 자동으로 표시함
  // 여기서는 아무것도 하지 않음 → 알림 한 번만 표시
  console.log('Background message received', payload);
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('https://nuball.vercel.app'));
});
