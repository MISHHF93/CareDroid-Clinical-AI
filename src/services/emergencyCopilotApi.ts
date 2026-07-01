import { apiFetchJson, getApiErrorMessage } from './apiClient';
import { isBackendCapabilityEnabled } from '../config/backendApiCapabilities';

export async function queryEmergencyCopilot(query, userRole) {
  if (!isBackendCapabilityEnabled('emergencyCopilotRuntime')) {
    return { ok: false, data: null, message: 'Backend Emergency Copilot endpoint is not available yet.' };
  }

  try {
    const { response, data } = await apiFetchJson('/api/emergency/copilot/query', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, user_role: userRole }),
    });
    if (!response.ok) {
      return { ok: false, data: null, message: data?.error || data?.message || getApiErrorMessage(null, response) };
    }
    return { ok: true, data, message: data?.message || '' };
  } catch (error: any) {
    return { ok: false, data: null, message: getApiErrorMessage(error) };
  }
}

export default Object.freeze({
  queryEmergencyCopilot,
});
