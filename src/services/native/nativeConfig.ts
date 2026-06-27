// Platform constants for browser-native APIs owned by the TypeScript app.

export const NATIVE_CONFIG = {
  deepLink: {
    scheme: 'caredroid',
    host: 'app',
    baseUrl: 'caredroid://app',
  },
  notifications: {
    channelName: 'CareDroid notifications',
    alertChannelName: 'Critical Alerts',
  },
  api: {
    timeoutMs: 30_000,
    maxRetries: 3,
  },
  ui: {
    maxMessageLength: 1000,
    animationDurationMs: 300,
    typingIndicatorDelayMs: 500,
  },
} as const;

export type NativeConfig = typeof NATIVE_CONFIG;
