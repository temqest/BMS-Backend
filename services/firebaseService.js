const fs = require('fs');
const path = require('path');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');

let firebaseApp = null;

function initFirebase() {
  if (firebaseApp) return firebaseApp;

  try {
    const apps = getApps();
    if (apps.length > 0) {
      firebaseApp = apps[0];
      return firebaseApp;
    }

    let serviceAccount = null;
    const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (serviceAccountEnv && serviceAccountEnv.trim().length > 0) {
      try {
        const trimmed = serviceAccountEnv.trim();
        const jsonString = trimmed.startsWith('{')
          ? trimmed
          : Buffer.from(trimmed, 'base64').toString('utf-8');
        serviceAccount = JSON.parse(jsonString);
      } catch (parseErr) {
        console.error('[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON:', parseErr.message);
        return null;
      }
    } else if (serviceAccountPath && serviceAccountPath.trim().length > 0) {
      try {
        const resolvedPath = path.isAbsolute(serviceAccountPath)
          ? serviceAccountPath
          : path.resolve(process.cwd(), serviceAccountPath);

        if (fs.existsSync(resolvedPath)) {
          const fileContent = fs.readFileSync(resolvedPath, 'utf-8');
          serviceAccount = JSON.parse(fileContent);
        } else {
          console.warn(`[Firebase] Service account file not found at: ${resolvedPath}`);
          return null;
        }
      } catch (fileErr) {
        console.error('[Firebase] Failed to read service account JSON file:', fileErr.message);
        return null;
      }
    }

    if (!serviceAccount) {
      console.warn(
        '[Firebase] Neither FIREBASE_SERVICE_ACCOUNT_KEY nor FIREBASE_SERVICE_ACCOUNT_PATH is configured. Push notifications will remain dormant.'
      );
      return null;
    }

    firebaseApp = initializeApp({
      credential: cert(serviceAccount),
    });

    console.log('[Firebase] Firebase Admin SDK initialized successfully.');
    return firebaseApp;
  } catch (error) {
    console.error('[Firebase] Error initializing Firebase Admin SDK:', error.message);
    return null;
  }
}

const { getAuth } = require('firebase-admin/auth');

async function verifyFirebasePhoneToken(idToken, expectedPhone) {
  const app = initFirebase();
  if (!app) {
    console.warn('[Firebase] Admin SDK not initialized; cannot verify phone token.');
    return { valid: false, error: 'Firebase Admin not configured' };
  }
  try {
    const auth = getAuth(app);
    const decodedToken = await auth.verifyIdToken(idToken);

    const tokenPhone = (decodedToken.phone_number || '').replace(/[\s-]/g, '');
    const cleanExpected = (expectedPhone || '').replace(/[\s-]/g, '');

    const isPhoneMatch = !expectedPhone ||
      tokenPhone === cleanExpected ||
      (cleanExpected.length >= 10 && tokenPhone.endsWith(cleanExpected.slice(-10))) ||
      (tokenPhone.length >= 10 && cleanExpected.endsWith(tokenPhone.slice(-10)));

    if (!isPhoneMatch) {
      console.warn(`[Firebase] Phone mismatch: token phone=${tokenPhone}, expected=${cleanExpected}`);
      return { valid: false, error: 'Phone number does not match verified token' };
    }

    return { valid: true, decodedToken };
  } catch (err) {
    console.error('[Firebase] Token verification error:', err.message);
    return { valid: false, error: err.message };
  }
}

initFirebase();

module.exports = {
  getMessaging,
  getAuth,
  initFirebase,
  verifyFirebasePhoneToken,
};
