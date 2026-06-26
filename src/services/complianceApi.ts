/**
 * GDPR / consent — wired to POST/GET /api/compliance/consent
 */

import { apiFetch, getApiErrorMessage, parseApiResponse } from './apiClient';
import { isBackendCapabilityEnabled } from '../config/backendApiCapabilities';

/**
 * @param {string} consentType - `marketing` | `data_processing` | `third_party_sharing`
 * @param {boolean} granted
 */
export async function updateConsentPreference(consentType, granted) {
  if (!isBackendCapabilityEnabled('complianceConsent')) {
    return {
      ok: false,
      unavailable: true,
      message: 'Consent API is not configured on this server.',
    };
  }

  try {
    const response = await apiFetch('/api/compliance/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consentType, granted }),
    });
    const data = await parseApiResponse(response, { fallback: {} });
    if (!response.ok) {
      return {
        ok: false,
        unavailable: false,
        message: data?.message || getApiErrorMessage(null, response),
        raw: data,
      };
    }
    return { ok: true, data };
  } catch (error: any) {
    return { ok: false, unavailable: false, message: getApiErrorMessage(error) };
  }
}

/**
 * Record onboarding consents using backend-supported consent types.
 * @param {{ dataProcessing: boolean, thirdPartySharing?: boolean, marketing?: boolean }} prefs
 */
export async function recordConsentPreferences(prefs) {
  const results = [] as any[];
  if (prefs.dataProcessing != null) {
    results.push(await updateConsentPreference('data_processing', Boolean(prefs.dataProcessing)));
  }
  if (prefs.thirdPartySharing != null) {
    results.push(
      await updateConsentPreference('third_party_sharing', Boolean(prefs.thirdPartySharing))
    );
  }
  if (prefs.marketing != null) {
    results.push(await updateConsentPreference('marketing', Boolean(prefs.marketing)));
  }

  const failed = results.find((r) => !r.ok);
  if (failed) {
    return { ok: false, message: failed.message, results };
  }
  return { ok: true, results };
}

export async function fetchConsentStatus() {
  if (!isBackendCapabilityEnabled('complianceConsent')) {
    return { ok: false, unavailable: true, status: null };
  }

  try {
    const response = await apiFetch('/api/compliance/consent');
    const data = await parseApiResponse(response, { fallback: {} });
    if (!response.ok) {
      return {
        ok: false,
        unavailable: false,
        message: getApiErrorMessage(null, response),
      };
    }
    return { ok: true, status: data };
  } catch (error: any) {
    return { ok: false, message: getApiErrorMessage(error) };
  }
}

export async function requestComplianceDataExport() {
  if (!isBackendCapabilityEnabled('complianceExport')) {
    return {
      ok: false,
      unavailable: true,
      message: 'Data export is not configured on this server.',
    };
  }

  try {
    const response = await apiFetch('/api/compliance/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await parseApiResponse(response, { fallback: {} });
    if (!response.ok) {
      return {
        ok: false,
        unavailable: false,
        message: data?.message || getApiErrorMessage(null, response),
        raw: data,
      };
    }
    return { ok: true, data };
  } catch (error: any) {
    return { ok: false, unavailable: false, message: getApiErrorMessage(error) };
  }
}

export async function requestComplianceAccountDeletion(confirmEmail) {
  try {
    const response = await apiFetch('/api/compliance/delete-account', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmEmail }),
    });
    const data = await parseApiResponse(response, { fallback: {} });
    if (!response.ok) {
      return {
        ok: false,
        unavailable: false,
        message: data?.message || getApiErrorMessage(null, response),
        raw: data,
      };
    }
    return { ok: true, data };
  } catch (error: any) {
    return { ok: false, unavailable: false, message: getApiErrorMessage(error) };
  }
}
