import { apiFetch, getApiErrorMessage, parseApiResponse } from './apiClient';

function resultError(message) {
  return { ok: false, data: null, message };
}

async function parseJson(response, fallback = {}) {
  try {
    return await parseApiResponse(response, { fallback });
  } catch {
    return fallback;
  }
}

export async function updateUserProfile(updates = {}) {
  const payload = Object.fromEntries(
    Object.entries(updates).filter(([, value]) => value !== undefined)
  );

  try {
    const response = await apiFetch('/api/users/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await parseJson(response, {});

    if (!response.ok) {
      return resultError(data?.message || getApiErrorMessage(null, response));
    }

    return { ok: true, data, message: '' };
  } catch (error) {
    return resultError(getApiErrorMessage(error));
  }
}
