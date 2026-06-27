// Web-first notification hook. Push registration is backend/web-worker owned now.

export interface WebNotificationPayload {
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}

export interface PushHandler {
  onToken?: (token: string) => void | Promise<void>;
  onNotification?: (notification: WebNotificationPayload) => void;
  onNotificationAction?: (action: WebNotificationPayload) => void;
  onRegistrationError?: (error: string) => void;
}

async function initialize(handler: PushHandler = {}): Promise<void> {
  if (typeof Notification === 'undefined') {
    handler.onRegistrationError?.('Browser notifications are not supported');
    return;
  }

  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }

  if (Notification.permission !== 'granted') {
    handler.onRegistrationError?.('Notification permission denied');
  }
}

async function removeAllListeners(): Promise<void> {
  // Browser notification listeners are owned by the service worker/event layer.
}

export const pushNotifications = { initialize, removeAllListeners };
