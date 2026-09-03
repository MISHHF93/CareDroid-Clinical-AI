import { apiFetch, getApiErrorMessage, getStoredAccessToken, parseApiResponse } from './apiClient';
import {
  isBackendCapabilityEnabled,
  UNSUPPORTED_CAPABILITY_MESSAGE,
} from '../config/backendApiCapabilities';
import {
  normalizeChannelListPayload,
  normalizeMessageListPayload,
} from './collaborationLocalCatalog';

export type CollaborationApiResult<T> = {
  ok: boolean;
  disabled?: boolean;
  unauthorized?: boolean;
  data: T | null;
  message: string;
};

function disabledResult(action: string): CollaborationApiResult<null> {
  return {
    ok: false,
    disabled: true,
    data: null,
    message: `${UNSUPPORTED_CAPABILITY_MESSAGE} ${action} is available in desk demo mode.`,
  };
}

function unauthorizedResult(action: string): CollaborationApiResult<null> {
  return {
    ok: false,
    unauthorized: true,
    data: null,
    message: `Sign in required for live ${action.toLowerCase()}. Using desk demo channels.`,
  };
}

async function requestJson(path: string, options: any = {}): Promise<CollaborationApiResult<any>> {
  try {
    const response = await apiFetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const data = await parseApiResponse<any>(response, { fallback: {} });
    if (response.status === 401 || response.status === 403) {
      return unauthorizedResult(path);
    }
    if (!response.ok) {
      return {
        ok: false,
        data: null,
        message: data?.message || getApiErrorMessage(null, response),
      };
    }
    return { ok: true, data, message: '' };
  } catch (error: any) {
    return { ok: false, data: null, message: getApiErrorMessage(error) };
  }
}

function guarded(action: string, fn: () => Promise<CollaborationApiResult<any>>) {
  if (!isBackendCapabilityEnabled('collaborationHub')) {
    return Promise.resolve(disabledResult(action));
  }
  if (!getStoredAccessToken()) {
    return Promise.resolve(unauthorizedResult(action));
  }
  return fn();
}

export function hasCollaborationLiveAuth() {
  return Boolean(isBackendCapabilityEnabled('collaborationHub') && getStoredAccessToken());
}

export async function fetchChannels(): Promise<
  CollaborationApiResult<Array<{ channel: any; membership?: any }>>
> {
  const result = await guarded('Collaboration channels', () =>
    requestJson('/api/collaboration/channels'),
  );
  if (!result.ok) return result as CollaborationApiResult<null> as any;
  return {
    ok: true,
    data: normalizeChannelListPayload(result.data),
    message: '',
  };
}

export function createChannel(payload: {
  type: string;
  name: string;
  description?: string;
  departmentKey?: string;
  patientId?: string;
}) {
  return guarded('Channel creation', () =>
    requestJson('/api/collaboration/channels', { method: 'POST', body: JSON.stringify(payload) }),
  );
}

export function archiveChannel(channelId: string) {
  return guarded('Channel archive', () =>
    requestJson(`/api/collaboration/channels/${encodeURIComponent(channelId)}/archive`, {
      method: 'POST',
    }),
  );
}

export async function fetchMessages(
  channelId: string,
  query: { before?: string; limit?: number; threadRootId?: string } = {},
): Promise<CollaborationApiResult<any[]>> {
  const params = new URLSearchParams();
  if (query.before) params.set('before', query.before);
  if (query.limit) params.set('limit', String(query.limit));
  if (query.threadRootId) params.set('threadRootId', query.threadRootId);
  const qs = params.toString();
  const result = await guarded('Message history', () =>
    requestJson(
      `/api/collaboration/channels/${encodeURIComponent(channelId)}/messages${qs ? `?${qs}` : ''}`,
    ),
  );
  if (!result.ok) return result as any;
  return { ok: true, data: normalizeMessageListPayload(result.data), message: '' };
}

export function postMessage(
  channelId: string,
  payload: {
    body: string;
    threadRootId?: string;
    mentionedUserIds?: string[];
    sourceType?: string;
    sourceId?: string;
  },
) {
  return guarded('Sending a message', () =>
    requestJson(`/api/collaboration/channels/${encodeURIComponent(channelId)}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  );
}

export function editMessage(messageId: string, body: string) {
  return guarded('Message edit', () =>
    requestJson(`/api/collaboration/messages/${encodeURIComponent(messageId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ body }),
    }),
  );
}

export function deleteMessage(messageId: string) {
  return guarded('Message delete', () =>
    requestJson(`/api/collaboration/messages/${encodeURIComponent(messageId)}`, {
      method: 'DELETE',
    }),
  );
}

export function addReaction(messageId: string, emoji: string) {
  return guarded('Reaction', () =>
    requestJson(`/api/collaboration/messages/${encodeURIComponent(messageId)}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    }),
  );
}

export function removeReaction(messageId: string, emoji: string) {
  return guarded('Reaction removal', () =>
    requestJson(
      `/api/collaboration/messages/${encodeURIComponent(messageId)}/reactions/${encodeURIComponent(emoji)}`,
      { method: 'DELETE' },
    ),
  );
}

export function pinMessage(messageId: string) {
  return guarded('Pin message', () =>
    requestJson(`/api/collaboration/messages/${encodeURIComponent(messageId)}/pin`, {
      method: 'POST',
    }),
  );
}

export function unpinMessage(messageId: string) {
  return guarded('Unpin message', () =>
    requestJson(`/api/collaboration/messages/${encodeURIComponent(messageId)}/pin`, {
      method: 'DELETE',
    }),
  );
}

export function fetchPinnedMessages(channelId: string) {
  return guarded('Pinned messages', () =>
    requestJson(`/api/collaboration/channels/${encodeURIComponent(channelId)}/pinned`),
  );
}

export function markChannelRead(channelId: string, lastReadMessageId: string) {
  return guarded('Read receipt', () =>
    requestJson(`/api/collaboration/channels/${encodeURIComponent(channelId)}/read`, {
      method: 'POST',
      body: JSON.stringify({ lastReadMessageId }),
    }),
  );
}

export function updateChannelMembership(
  channelId: string,
  payload: { notificationPreference?: string },
) {
  return guarded('Notification preference', () =>
    requestJson(`/api/collaboration/channels/${encodeURIComponent(channelId)}/membership`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  );
}

export function sendTyping(channelId: string, isTyping: boolean) {
  return guarded('Typing indicator', () =>
    requestJson(`/api/collaboration/channels/${encodeURIComponent(channelId)}/typing`, {
      method: 'POST',
      body: JSON.stringify({ isTyping }),
    }),
  );
}

export function uploadAttachment(
  messageId: string,
  payload: { fileName: string; mimeType: string; dataBase64: string },
) {
  return guarded('Attachment upload', () =>
    requestJson(`/api/collaboration/messages/${encodeURIComponent(messageId)}/attachments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  );
}

export function searchMessages(query: string) {
  return guarded('Message search', () =>
    requestJson(`/api/collaboration/search?query=${encodeURIComponent(query)}`),
  );
}

export function fetchPatientThread(patientId: string) {
  return guarded('Patient thread', () =>
    requestJson(`/api/collaboration/patients/${encodeURIComponent(patientId)}/thread`),
  );
}

export function createIncident(payload: {
  title: string;
  description?: string;
  severity: 'critical' | 'high' | 'moderate' | 'low';
  triggerType: string;
  patientId?: string;
}) {
  return guarded('Incident channel', () =>
    requestJson('/api/collaboration/incidents', { method: 'POST', body: JSON.stringify(payload) }),
  );
}
