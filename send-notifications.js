const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://nuball-default-rtdb.firebaseio.com'
});

async function cleanExpiredRooms(db) {
  try {
    const snap = await db.ref('rooms').once('value');
    if (!snap.exists()) { console.log('No rooms to clean'); return; }
    const now = Date.now();
    let deleted = 0;
    const promises = [];
    snap.forEach(child => {
      const data = child.val();
      if (data && data.expiresAt && data.expiresAt < now) {
        promises.push(db.ref('rooms/' + child.key).remove());
        deleted++;
      }
    });
    await Promise.all(promises);
    console.log(`Cleaned ${deleted} expired rooms`);
  } catch (e) {
    console.error('Room cleanup failed:', e);
  }
}

async function sendDailyNotifications() {
  const db = admin.database();

  // 만료된 방 정리
  await cleanExpiredRooms(db);

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
          icon: 'https://nuball.app/og-image.PNG',
          url: 'https://nuball.app'
        },
        android: { priority: 'high' },
        webpush: {
          headers: { Urgency: 'high', TTL: '86400' },
          fcmOptions: { link: 'https://nuball.app' }
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
