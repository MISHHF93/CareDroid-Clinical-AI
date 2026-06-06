import { isBackendCapabilityEnabled } from '../config/backendApiCapabilities';
import { apiFetchJson, getApiErrorMessage } from './apiClient';
import { recordAutomationBlocked, recordAutomationFailure } from './automationAuditLogger';

export async function fetchLiveTrackingCapability(capability, path, options = {}) {
  if (!isBackendCapabilityEnabled(capability)) {
    await recordAutomationBlocked({
      triggerFired: `${capability} live data requested`,
      conditionsEvaluated: [{ label: `${capability} backend capability enabled`, result: false }],
      actionSelected: 'Fetch live device or tracking data',
      toolCalled: capability,
      backendEndpoint: path,
      reason: 'Backend capability is disabled.',
    });
    return { ok: false, unsupported: true, message: 'Backend capability is disabled.' };
  }

  try {
    const { response, data } = await apiFetchJson(path, options);
    if (!response.ok || data?.success === false) {
      await recordAutomationFailure({
        triggerFired: `${capability} live data request failed`,
        actionSelected: 'Fetch live device or tracking data',
        toolCalled: capability,
        backendEndpoint: path,
        error: data?.message || getApiErrorMessage(null, response),
      });
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
    await recordAutomationFailure({
      triggerFired: `${capability} live data request failed`,
      actionSelected: 'Fetch live device or tracking data',
      toolCalled: capability,
      backendEndpoint: path,
      error,
    });
    return {
      ok: false,
      unsupported: false,
      message: getApiErrorMessage(error),
    };
  }
}
