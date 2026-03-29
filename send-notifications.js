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

  const koTokens = [];
  const enTokens = [];

  snapshot.forEach(child => {
    const data = child.val();
    if (data && data.token) {
      if (data.lang === 'en') {
        enTokens.push(data.token);
      } else {
        koTokens.push(data.token);
      }
    }
  });

  console.log(`KO: ${koTokens.length}, EN: ${enTokens.length}`);

  const batches = [
    {
      tokens: koTokens,
      title: 'NUBALL ⚾',
      body: '오늘의 누볼이 기다리고 있어요! 지금 바로 플레이하세요 🎯'
    },
    {
      tokens: enTokens,
      title: 'NUBALL ⚾',
      body: "Today's NUBALL is waiting! Play now 🎯"
    }
  ];

  for (const { tokens, title, body } of batches) {
    if (tokens.length === 0) continue;

    const batchSize = 500;
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);

      const message = {
        data: {
          title,
          body,
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
            console.log(`Failed token: ${failedToken.substring(0, 20)}... Error: ${resp.error?.code}`);
            // 유효하지 않은 토큰 삭제
            if (
              resp.error?.code === 'messaging/invalid-registration-token' ||
              resp.error?.code === 'messaging/registration-token-not-registered'
            ) {
              snapshot.forEach(child => {
                if (child.val()?.token === failedToken) {
                  db.ref('fcm_tokens/' + child.key).remove();
                  console.log(`Removed invalid token for uid: ${child.key}`);
                }
              });
            }
          }
        });
      } catch (e) {
        console.error('Batch send failed:', e);
      }
    }
  }

  console.log('Daily notifications sent successfully');
}

sendDailyNotifications().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
