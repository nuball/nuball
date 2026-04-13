const admin = require('firebase-admin');

// Firebase 앱 중복 초기화 방지
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://nuball-default-rtdb.firebaseio.com'
  });
}

async function sendNotifications() {
  const db = admin.database();

  const snapshot = await db.ref('fcm_tokens').once('value');
  if (!snapshot.exists()) {
    console.log('No FCM tokens found');
    return { success: 0, failed: 0 };
  }

  const koTokens = [];
  const enTokens = [];
  snapshot.forEach(child => {
    const data = child.val();
    if (data && data.token) {
      if (data.lang === 'en') enTokens.push(data.token);
      else koTokens.push(data.token);
    }
  });

  console.log(`KO: ${koTokens.length}, EN: ${enTokens.length}`);

  const batches = [
    {
      tokens: koTokens,
      title: '⚔️ 누볼 배틀',
      body: '오늘의 배틀이 기다리고 있어요! 지금 바로 도전하세요 🗺️'
    },
    {
      tokens: enTokens,
      title: '⚔️ NUBALL BATTLE',
      body: "Today's battle is waiting! Capture your territory now 🗺️"
    }
  ];

  let totalSuccess = 0, totalFailed = 0;

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
          url: 'https://nuball.app/battle'
        },
        android: { priority: 'high' },
        webpush: {
          headers: { Urgency: 'high', TTL: '86400' },
          fcmOptions: { link: 'https://nuball.app/battle' }
        },
        tokens: batch
      };
      try {
        const response = await admin.messaging().sendEachForMulticast(message);
        totalSuccess += response.successCount;
        totalFailed += response.failureCount;
        console.log(`Sent: ${response.successCount} success, ${response.failureCount} failed`);

        // 만료 토큰 삭제
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const code = resp.error?.code;
            console.log(`Failed: ${code}`);
            if (
              code === 'messaging/invalid-registration-token' ||
              code === 'messaging/registration-token-not-registered'
            ) {
              const failedToken = batch[idx];
              snapshot.forEach(child => {
                if (child.val()?.token === failedToken) {
                  db.ref('fcm_tokens/' + child.key).remove();
                }
              });
            }
          }
        });
      } catch (e) {
        console.error('Batch send failed:', e);
        totalFailed += batch.length;
      }
    }
  }

  return { success: totalSuccess, failed: totalFailed };
}

module.exports = async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await sendNotifications();
    console.log('Daily notifications sent:', result);
    res.status(200).json({ ok: true, ...result });
  } catch (e) {
    console.error('sendNotifications failed:', e);
    res.status(500).json({ error: e.message });
  }
};
