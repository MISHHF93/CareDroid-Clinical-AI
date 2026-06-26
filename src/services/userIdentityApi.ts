import { apiFetch, getApiErrorMessage, parseApiResponse } from './apiClient';

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

export const UserIdentityApi = {
  fetchOperationalProfile() {
    return requestJson('/api/profile/me');
  },

  updateOperationalProfile(updates) {
    return requestJson('/api/profile/me', {
      method: 'PATCH',
      body: JSON.stringify(updates || {}),
    });
  },

  fetchPreferences() {
    return requestJson('/api/profile/me/preferences');
  },

  updatePreferences(preferences) {
    return requestJson('/api/profile/me/preferences', {
      method: 'PATCH',
      body: JSON.stringify(preferences || {}),
    });
  },

  fetchActivity() {
    return requestJson('/api/profile/me/activity');
  },

  fetchSecurity() {
    return requestJson('/api/profile/me/security');
  },

  fetchWorkspaces() {
    return requestJson('/api/profile/me/workspaces');
  },

  switchWorkspace(workspaceId) {
    return requestJson('/api/profile/me/workspaces/active', {
      method: 'PATCH',
      body: JSON.stringify({ workspaceId }),
    });
  },

  createWorkspace(workspace) {
    return requestJson('/api/workspaces', {
      method: 'POST',
      body: JSON.stringify(workspace || {}),
    });
  },

  recordActivity(activity) {
    return requestJson('/api/activity', {
      method: 'POST',
      body: JSON.stringify(activity || {}),
    });
  },

  fetchPersonalization() {
    return requestJson('/api/personalization/me');
  },

  updatePersonalization(updates) {
    return requestJson('/api/personalization/me', {
      method: 'PATCH',
      body: JSON.stringify(updates || {}),
    });
  },

  savePrompt(prompt) {
    return requestJson('/api/personalization/me/saved-prompts', {
      method: 'POST',
      body: JSON.stringify(prompt || {}),
    });
  },
};

export default UserIdentityApi;
