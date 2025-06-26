import { Resend } from 'resend';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import cron from 'node-cron';
import dotenv from 'dotenv';

dotenv.config();

// Validate required environment variables
const requiredEnv = ['FIREBASE_SERVICE_ACCOUNT', 'RESEND_API_KEY', 'DOMAIN'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  // Fix the private key formatting
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

} catch (e) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON or private key is incorrectly formatted');
}

// Initialize Firebase Admin
initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();
const resend = new Resend(process.env.RESEND_API_KEY);

const emailScheduler = () => {
  console.log('Email scheduler started...');
  cron.schedule('* * * * *', async () => {
    console.log('Checking for due emails...');
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5);
    try {
      const snapshot = await db.collection('emails')
        .where('deliveryDate', '==', currentDate)
        .where('deliveryTime', '==', currentTime)
        .where('delivered', '==', false)
        .get();
      if (snapshot.empty) return;
      await Promise.all(snapshot.docs.map(async (doc) => {
        const data = doc.data();
        try {
          await resend.emails.send({
            from: `Time Capsule <noreply@${process.env.DOMAIN}>`,
            to: data.recipientEmail,
            subject: 'A Message from the Past ⏳',
            text: data.message,
          });
          await db.collection('emails').doc(doc.id).update({ delivered: true });
          console.log(`✅ Email sent to ${data.recipientEmail}`);
        } catch (error) {
          console.error('❌ Failed to send email:', error, 'Doc ID:', doc.id);
        }
      }));
    } catch (error) {
      console.error('❌ Error fetching emails:', error);
    }
  });
};

export default emailScheduler;
