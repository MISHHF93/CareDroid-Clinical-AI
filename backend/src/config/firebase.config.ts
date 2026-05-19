/**
 * Firebase Configuration
 * Configuration for Firebase Admin SDK (push notifications, cloud storage)
 */

import { registerAs } from '@nestjs/config';

export default registerAs('firebase', () => ({
  // Service account credentials (JSON string or path)
  serviceAccount: process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : null,

  // Alternative: Path to service account JSON file
  credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,

  // Firebase project configuration
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,

  // Feature flags
  pushNotificationsEnabled: process.env.FIREBASE_PUSH_ENABLED !== 'false',

  // Notification settings
  notification: {
    timeToLive: parseInt(process.env.FIREBASE_NOTIFICATION_TTL || '86400', 10), // 24 hours default
    priority: process.env.FIREBASE_NOTIFICATION_PRIORITY || 'high',
    collapseKey: process.env.FIREBASE_COLLAPSE_KEY || 'caredroid-notifications',
  },
}));
