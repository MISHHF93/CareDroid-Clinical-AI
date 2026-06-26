// Android-specific constants that have no equivalent in the shared TypeScript config.
// Routes, roles, and permissions live in src/config/ — this covers deep links,
// push channels, and WebView-tuned UI timing from AppConstants.kt / Constants.kt.

export const NATIVE_CONFIG = {
  deepLink: {
    scheme: 'caredroid',
    host: 'app',
    baseUrl: 'caredroid://app',
  },
  push: {
    channelId: 'caredroid_channel',
    channelName: 'CareDroid notifications',
    channelDescription: 'Clinical alerts and updates from CareDroid',
    alertChannelId: 'caredroid_alerts',
    alertChannelName: 'Critical Alerts',
    alertChannelDescription: 'Critical clinical alerts requiring immediate attention',
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
