import { apiFetch, getApiErrorMessage, parseApiResponse } from './apiClient';
import { fetchMyAuditLogs } from './auditApi';

async function requestJson(path, options: any = {}) {
  try {
    const response = await apiFetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const data = await parseApiResponse(response, { fallback: {} });
    if (!response.ok) {
      return { ok: false, data: null, message: data?.message || getApiErrorMessage(null, response) };
    }
    return { ok: true, data, message: '' };
  } catch (error: any) {
    return { ok: false, data: null, message: getApiErrorMessage(error) };
  }
}

export async function fetchOperationalStaffProfile() {
  return requestJson('/api/profile/me');
}

export async function fetchAuthSession() {
  return requestJson('/api/auth/me');
}

export async function fetchNotificationPreferences() {
  return requestJson('/api/notifications/preferences');
}

export async function recordEmergencyActivity(activity: any = {}) {
  return requestJson('/api/activity', {
    method: 'POST',
    body: JSON.stringify(activity),
  });
}

export async function syncEmergencyAuditEvent(event: any = {}) {
  return requestJson('/api/audit/sync', {
    method: 'POST',
    body: JSON.stringify(event),
  });
}

export async function fetchEmergencyAuditLog(limit = 20) {
  return fetchMyAuditLogs(limit);
}

export default {
  fetchOperationalStaffProfile,
  fetchAuthSession,
  fetchNotificationPreferences,
  recordEmergencyActivity,
  syncEmergencyAuditEvent,
  fetchEmergencyAuditLog,
};
