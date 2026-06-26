import { UNSUPPORTED_CAPABILITY_MESSAGE } from '../config/backendApiCapabilities';

/**
 * @param {string} capability
 * @param {string} endpoint
 * @param {unknown} [data]
 * @returns {import('../../types/api').ApiUnavailableResponse}
 */
export function makeDisabledCapabilityResponse(capability, endpoint, data = null) {
  return {
    ok: false,
    unavailable: true,
    mocked: true,
    capability,
    endpoint,
    message: UNSUPPORTED_CAPABILITY_MESSAGE,
    data,
  };
}

/**
 * TODO(backend): Replace with POST /api/sync once the bulk sync contract is implemented.
 * @param {number} queued
 * @returns {import('../../types/api').OfflineSyncResponse}
 */
export function makeBulkSyncDisabledResponse(queued = 0) {
  return {
    ok: false,
    synced: 0,
    total: queued,
    queued,
    unavailable: true,
    items: [],
    message: 'Bulk sync is queued locally until the backend sync endpoint is available.',
  };
}

/**
 * TODO(backend): Replace with server-side notification stream once SSE/WebSocket support ships.
 * @returns {import('../../types/api').NotificationStreamResponse}
 */
export function makeNotificationStreamDisabledResponse() {
  return {
    ...makeDisabledCapabilityResponse('notificationStream', '/api/notifications/stream', {
      eventSource: null,
      reconnectAfterMs: null,
    } as any),
  };
}

/**
 * TODO(backend): Replace with POST /api/notifications/send/:channel.
 * @param {string} channel
 * @returns {import('../../types/api').NotificationSendResponse}
 */
export function makeNotificationSendDisabledResponse(channel) {
  return {
    ok: false,
    success: false,
    unavailable: true,
    channel,
    message: `Notification channel "${channel}" is not available on this server.`,
  };
}
