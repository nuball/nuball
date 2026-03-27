const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://nuball-default-rtdb.firebaseio.com'
});

async function sendDailyNotifications() {
  const db = admin.database();
  const snapshot = await db.ref('fcm_tokens').once('value');

  if (!snapshot.exists()) {
    console.log('No FCM tokens found');
    return;
  }

  const tokens = [];
  snapshot.forEach(child => {
    const data = child.val();
    if (data && data.token) tokens.push(data.token);
  });

  console.log(`Sending notifications to ${tokens.length} users`);

  const batchSize = 500;
  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);

    // data-only: notification 필드 없음
    // → FCM 자동처리 없음 → SW의 onBackgroundMessage만 실행
    // → 알림 한 번만 표시, Android 백그라운드 안정적
    const message = {
      data: {
        title: 'NUBALL ⚾',
        body: '오늘의 누볼이 기다리고 있어요! 지금 바로 플레이하세요 🎯',
        icon: 'https://nuball.vercel.app/og-image.PNG',
        url: 'https://nuball.vercel.app'
      },
      android: {
        priority: 'high'
      },
      webpush: {
        headers: {
          Urgency: 'high',
          TTL: '86400'
        },
        fcmOptions: {
          link: 'https://nuball.vercel.app'
        }
      },
      tokens: batch
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(`Sent: ${response.successCount} success, ${response.failureCount} failed`);

      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const failedToken = batch[idx];
          console.log(`Removing invalid token: ${failedToken.substring(0, 20)}...`);
          snapshot.forEach(child => {
            if (child.val()?.token === failedToken) {
              db.ref('fcm_tokens/' + child.key).remove();
            }
          });
        }
      });
    } catch (e) {
      console.error('Batch send failed:', e);
    }
  }

  console.log('Daily notifications sent successfully');
}

sendDailyNotifications().catch(console.error);
