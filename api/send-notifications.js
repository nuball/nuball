const admin = require('firebase-admin');

let app;
function getApp() {
  if (!app) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: 'https://nuball-default-rtdb.firebaseio.com'
    });
  }
  return admin.app();
}

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

async function sendNotifications() {
  getApp();
  const db = admin.database();
  await cleanExpiredRooms(db);

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
    { tokens: koTokens, title: 'NUBALL ⚾', body: '오늘의 누볼이 기다리고 있어요! 지금 바로 플레이하세요 🎯' },
    { tokens: enTokens, title: 'NUBALL ⚾', body: "Today's NUBALL is waiting! Play now 🎯" }
  ];

  let totalSuccess = 0, totalFailed = 0;
  for (const { tokens, title, body } of batches) {
    if (tokens.length === 0) continue;
    const batchSize = 500;
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      const message = {
        data: { title, body, icon: 'https://nuball.app/og-image.PNG', url: 'https://nuball.app' },
        android: { priority: 'high' },
        webpush: {
          headers: { Urgency: 'high', TTL: '86400' },
          fcmOptions: { link: 'https://nuball.app' }
        },
        tokens: batch
      };
      try {
        const response = await admin.messaging().sendEachForMulticast(message);
        totalSuccess += response.successCount;
        totalFailed += response.failureCount;
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
  return { success: totalSuccess, failed: totalFailed };
}

module.exports = async (req, res) => {
  // Vercel Cron 인증 확인
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await sendNotifications();
    console.log('Daily notifications sent successfully');
    res.status(200).json({ ok: true, ...result });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};
