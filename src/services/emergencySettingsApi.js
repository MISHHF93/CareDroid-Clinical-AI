import { apiFetch, getApiErrorMessage, parseApiResponse } from './apiClient';
import { getTenantContext } from './tenantContextStore';
import { isBackendCapabilityEnabled } from '../config/backendApiCapabilities';

export const EMERGENCY_SETTINGS_ENDPOINT = '/api/emergency/settings';

async function guardedJson(capability, path, options = {}) {
  if (!isBackendCapabilityEnabled(capability)) {
    return { ok: false, data: null, message: 'Backend endpoint not available yet.' };
  }

  try {
    const response = await apiFetch(path, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
    });
    const data = await parseApiResponse(response, { fallback: {} });
    if (!response.ok) {
      return { ok: false, data: null, message: data?.message || getApiErrorMessage(null, response) };
    }
    return { ok: true, data, message: data?.message || '' };
  } catch (error) {
    return { ok: false, data: null, message: getApiErrorMessage(error) };
  }
}

async function requestSettingsJson(path, options = {}) {
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
      return { ok: false, data: null, message: data?.message || getApiErrorMessage(null, response), status: response.status };
    }
    return { ok: true, data, message: data?.message || '', status: response.status };
  } catch (error) {
    return { ok: false, data: null, message: getApiErrorMessage(error), status: error?.status || 0 };
  }
}

function organizationId() {
  return getTenantContext()?.organizationId || '';
}

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   enabled: boolean,
 * }} EmergencyModuleSetting
 *
 * @typedef {{
 *   tenantName: string,
 *   defaultWorkspace: string,
 *   enabledModules: EmergencyModuleSetting[],
 *   aiSettings: Record<string, string|boolean>,
 *   integrationSettings: Record<string, string|boolean>,
 *   provincialHealthSettings: Record<string, string|boolean>,
 *   notificationSettings: Record<string, string|number|boolean>,
 *   reassessmentThresholds: Record<string, number>,
 *   capacityThresholds: Record<string, number>,
 *   emsThresholds: Record<string, number|boolean>,
 *   boardingThresholds: Record<string, number>,
 *   thresholds: {
 *     waitWarningMinutes: number,
 *     waitCriticalMinutes: number,
 *     capacityWarningPercent: number,
 *     emsOffloadTargetMinutes: number,
 *     reassessmentIntervals: Record<string, number>,
 *   },
 *   departmentCapacityTarget: number,
 *   alertRules: Record<string, { enabled: boolean, severity: string }>,
 * }} EmergencyOsSettings
 */

export function fetchEmergencyOsSettings() {
  return guardedJson('emergencyDepartmentSettings', EMERGENCY_SETTINGS_ENDPOINT);
}

/**
 * @param {Partial<EmergencyOsSettings>} payload
 */
export function saveEmergencyOsSettings(payload) {
  return guardedJson('emergencyDepartmentSettings', EMERGENCY_SETTINGS_ENDPOINT, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

function saveTenantEmergencySettings(section, payload) {
  const orgId = organizationId();
  if (!orgId) return Promise.resolve({ ok: false, data: null, message: 'No organization context available.' });
  return guardedJson('tenantAdministration', `/api/organizations/${encodeURIComponent(orgId)}/tenant-admin`, {
    method: 'PATCH',
    body: JSON.stringify({
      settings: {
        emergencyOs: {
          [section]: payload,
          updatedAt: new Date().toISOString(),
        },
      },
    }),
  });
}

export function saveDepartmentSettings(payload) {
  return saveTenantEmergencySettings('department', payload);
}

export function saveThresholdSettings(payload) {
  return saveTenantEmergencySettings('thresholds', payload);
}

export function saveAlertRuleSettings(payload) {
  return saveTenantEmergencySettings('alertRules', payload);
}

export function saveStaffSettings(payload) {
  return saveTenantEmergencySettings('staff', payload);
}

export function fetchIntegrationStatuses() {
  return Promise.allSettled([
    guardedJson('integrationStatus', '/api/integrations/fhir/connections'),
    guardedJson('integrationStatus', '/api/integrations/hl7/interfaces'),
  ]).then(([fhir, hl7]) => ({
    fhir: fhir.status === 'fulfilled' ? fhir.value : { ok: false, data: null, message: fhir.reason?.message },
    hl7: hl7.status === 'fulfilled' ? hl7.value : { ok: false, data: null, message: hl7.reason?.message },
  }));
}

export function testIntegrationConnection(kind, id) {
  const normalizedKind = String(kind || '').toLowerCase();
  if (normalizedKind === 'hl7') {
    return guardedJson('integrationTest', `/api/integrations/hl7/interfaces/${encodeURIComponent(id)}/test-message`, {
      method: 'POST',
      body: JSON.stringify({ testOnly: true }),
    });
  }
  return guardedJson('integrationTest', `/api/integrations/fhir/${encodeURIComponent(id)}/test`, {
    method: 'POST',
    body: JSON.stringify({ testOnly: true }),
  });
}

export function fetchProtocolsAdmin() {
  return guardedJson('protocolsAdmin', '/api/protocols');
}

export function updateProtocolAdmin(id, payload) {
  return guardedJson('protocolsAdmin', `/api/protocols/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function fetchOrganizationFeatureFlags() {
  const orgId = organizationId();
  if (!orgId) return Promise.resolve({ ok: false, data: null, message: 'No organization context available.' });
  return guardedJson('organizationFeatureFlags', `/api/organizations/${encodeURIComponent(orgId)}/feature-flags`);
}

export function updateOrganizationFeatureFlag(payload) {
  const orgId = organizationId();
  if (!orgId) return Promise.resolve({ ok: false, data: null, message: 'No organization context available.' });
  return guardedJson('organizationFeatureFlags', `/api/organizations/${encodeURIComponent(orgId)}/feature-flags`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function fetchSettingsFeatureFlags() {
  return requestSettingsJson('/api/settings/features');
}

export function updateSettingsFeatureFlag({ featureId, enabled, changedBy, timestamp }) {
  return requestSettingsJson('/api/settings/features', {
    method: 'PATCH',
    body: JSON.stringify({
      featureId,
      enabled,
      changedBy,
      timestamp,
    }),
  });
}

export function subscribeToSettingsFeatureChanges(onChange) {
  const supabaseClient =
    (typeof window !== 'undefined' && window.supabase) ||
    (typeof globalThis !== 'undefined' && globalThis.supabase);
  if (!supabaseClient?.channel || typeof onChange !== 'function') {
    return () => {};
  }

  const channel = supabaseClient
    .channel('features')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'feature_flags' },
      (payload) => onChange(payload),
    )
    .subscribe();

  return () => {
    if (typeof supabaseClient.removeChannel === 'function') {
      supabaseClient.removeChannel(channel);
      return;
    }
    if (typeof channel?.unsubscribe === 'function') {
      channel.unsubscribe();
    }
  };
}
