import { apiFetch, getApiErrorMessage, parseApiResponse } from './apiClient';

function disabled(message) {
  return { ok: false, data: null, message };
}

export async function fetchIdentityProviderRegistry() {
  try {
    const response = await apiFetch('/api/auth/identity-providers');
    const data = await parseApiResponse(response, { fallback: null });
    if (!response.ok) {
      return disabled(data?.message || getApiErrorMessage(null, response));
    }
    return { ok: true, data, message: '' };
  } catch (error) {
    return disabled(getApiErrorMessage(error));
  }
}
