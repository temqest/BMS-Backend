const prisma = require('../util/db');
const { getMessaging, initFirebase } = require('./firebaseService');

/**
 * Send a push notification to a user by their user_id.
 * Automatically handles token lookup, error handling, and dead-token cleanup.
 *
 * @param {string} userId - Target User ID in the database
 * @param {string} title - Notification Title
 * @param {string} body - Notification Body text
 * @param {Record<string, any>} [dataPayload={}] - Key-value custom payload (will be stringified)
 * @returns {Promise<{ success: boolean, messageId?: string, reason?: string, error?: string }>}
 */
async function sendNotificationToUser(userId, title, body, dataPayload = {}) {
  try {
    const app = initFirebase();
    if (!app) {
      console.warn('[FCM] Push skipped: Firebase Admin SDK is not configured (FIREBASE_SERVICE_ACCOUNT_KEY missing).');
      return { success: false, reason: 'Firebase not configured' };
    }

    // 1. Fetch user and registered FCM token
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { user_id: true, fcm_token: true, first_name: true, last_name: true },
    });

    if (!user) {
      console.warn(`[FCM] Target user ${userId} not found.`);
      return { success: false, reason: 'User not found' };
    }

    if (!user.fcm_token) {
      console.log(`[FCM] User ${userId} (${user.first_name} ${user.last_name}) has no active FCM token.`);
      return { success: false, reason: 'No FCM token' };
    }

    // 2. Format custom data payload (FCM requires string-only key-value map in data)
    const sanitizedData = {};
    if (dataPayload && typeof dataPayload === 'object') {
      for (const [key, value] of Object.entries(dataPayload)) {
        if (value !== undefined && value !== null) {
          sanitizedData[key] = typeof value === 'string' ? value : JSON.stringify(value);
        }
      }
    }

    // 3. Assemble FCM message
    const message = {
      token: user.fcm_token,
      notification: {
        title: title || 'Birth Monitoring Notification',
        body: body || '',
      },
      data: sanitizedData,
      android: {
        priority: 'high',
        notification: {
          channelId: 'bms_high_priority_channel',
          sound: 'default',
          priority: 'high',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    // 4. Send via Firebase Cloud Messaging
    const messaging = getMessaging(app);
    const response = await messaging.send(message);
    console.log(`[FCM] Successfully delivered push notification to user ${userId} (FCM ID: ${response})`);
    return { success: true, messageId: response };
  } catch (error) {
    const errorCode = error.code || error.message;
    console.error(`[FCM] Failed to send push notification to user ${userId}:`, errorCode);

    // 5. Cleanup dead/unregistered/invalid tokens
    const invalidTokenErrorCodes = [
      'messaging/registration-token-not-registered',
      'messaging/invalid-registration-token',
      'messaging/invalid-argument',
    ];

    if (invalidTokenErrorCodes.includes(error.code)) {
      console.log(`[FCM] Unregistered/invalid token encountered for user ${userId}. Clearing fcm_token.`);
      try {
        await prisma.user.update({
          where: { user_id: userId },
          data: { fcm_token: null },
        });
      } catch (dbErr) {
        console.error('[FCM] Failed to reset invalid fcm_token in database:', dbErr.message);
      }
    }

    return { success: false, error: errorCode };
  }
}

module.exports = {
  sendNotificationToUser,
};
