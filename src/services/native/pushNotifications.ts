// TypeScript replacement for CareDroidMessagingService.kt (Firebase FCM service)
// Uses @capacitor/push-notifications which wraps FCM on Android.
// Only active on native platform — silently no-ops on web.

import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  type Token,
  type ActionPerformed,
  type PushNotificationSchema,
} from '@capacitor/push-notifications';

export interface PushHandler {
  onToken?: (token: string) => void | Promise<void>;
  onNotification?: (notification: PushNotificationSchema) => void;
  onNotificationAction?: (action: ActionPerformed) => void;
  onRegistrationError?: (error: string) => void;
}

async function initialize(handler: PushHandler = {}): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const { receive } = await PushNotifications.requestPermissions();
  if (receive !== 'granted') {
    handler.onRegistrationError?.('Push notification permission denied');
    return;
  }

  await PushNotifications.register();

  await PushNotifications.addListener('registration', async (token: Token) => {
    await handler.onToken?.(token.value);
  });

  await PushNotifications.addListener(
    'registrationError',
    (error: { error: string }) => {
      handler.onRegistrationError?.(error.error);
    },
  );

  await PushNotifications.addListener(
    'pushNotificationReceived',
    (notification: PushNotificationSchema) => {
      handler.onNotification?.(notification);
    },
  );

  await PushNotifications.addListener(
    'pushNotificationActionPerformed',
    (action: ActionPerformed) => {
      handler.onNotificationAction?.(action);
    },
  );
}

async function removeAllListeners(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await PushNotifications.removeAllListeners();
}

export const pushNotifications = { initialize, removeAllListeners };
