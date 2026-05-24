import { isBackendCapabilityEnabled } from '../config/backendApiCapabilities';
import { apiFetchJson, getApiErrorMessage } from './apiClient';

export async function fetchLiveTrackingCapability(capability, path, options = {}) {
  if (!isBackendCapabilityEnabled(capability)) {
    return { ok: false, unsupported: true, message: 'Backend capability is disabled.' };
  }

  try {
    const { response, data } = await apiFetchJson(path, options);
    if (!response.ok || data?.success === false) {
      return {
        ok: false,
        unsupported: false,
        status: response.status,
        message: data?.message || getApiErrorMessage(null, response),
      };
    }

    return {
      ok: true,
      data,
      payload: data?.data ?? data,
      message: data?.message || '',
      sourceLabel: data?.sourceLabel || '',
      generatedAt: data?.generatedAt || null,
      demo: Boolean(data?.demo),
    };
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    return {
      ok: false,
      unsupported: false,
      message: getApiErrorMessage(error),
    };
  }
}
