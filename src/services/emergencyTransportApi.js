import { apiFetch, getApiErrorMessage, parseApiResponse } from './apiClient';
import { isBackendCapabilityEnabled } from '../config/backendApiCapabilities';

function normalizeUnit(vehicle = {}) {
  const status =
    vehicle.status === 'available'
      ? 'Available'
      : vehicle.status === 'maintenance'
        ? 'OutOfService'
        : vehicle.status === 'occupied'
          ? 'Inbound'
          : 'Dispatched';

  return {
    id: vehicle.id,
    callSign: vehicle.label || vehicle.id,
    agency: 'Backend Fleet',
    status,
    crewStaffIds: [],
    lastKnownLocation: vehicle.destination || vehicle.locationSource || 'Location unavailable',
    driver: vehicle.driver,
    etaMinutes: vehicle.etaMinutes,
    freshness: vehicle.freshness,
    source: 'backend-fleet-demo',
  };
}

async function guardedJson(capability, path, options = {}) {
  if (!isBackendCapabilityEnabled(capability)) {
    return { ok: false, data: null, message: 'Backend endpoint not available yet.' };
  }

  try {
    const response = await apiFetch(path, options);
    const data = await parseApiResponse(response, { fallback: {} });
    if (!response.ok) {
      return { ok: false, data: null, message: data?.message || getApiErrorMessage(null, response) };
    }
    return { ok: true, data, message: data?.message || '' };
  } catch (error) {
    return { ok: false, data: null, message: getApiErrorMessage(error) };
  }
}

export async function fetchEmsFleetSnapshot() {
  const result = await guardedJson('fleetLiveTracking', '/api/fleet/snapshot');
  if (!result.ok) return result;

  const snapshot = result.data?.data || result.data || {};
  const vehicles = snapshot.vehicles || [];
  return {
    ok: true,
    data: {
      source: result.data?.source || 'demo-fleet-live-tracking',
      generatedAt:
        result.data?.generatedAt ||
        snapshot.generatedAt ||
        snapshot.updatedAt ||
        new Date().toISOString(),
      sourceLabel:
        result.data?.sourceLabel ||
        'Backend demo fleet live tracking - not an EMS CAD/ePCR feed.',
      units: vehicles.map(normalizeUnit),
      summary: snapshot.summary || {},
      alerts: snapshot.alerts || [],
    },
    message: result.message,
  };
}

export function persistEmergencyReferral(referral) {
  return guardedJson('emergencyReferralPersistence', '/api/emergency/referrals', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(referral),
  });
}

export function fetchEmergencyReferralHistory(patientId) {
  return guardedJson(
    'emergencyReferralHistory',
    `/api/emergency/patients/${encodeURIComponent(patientId)}/referrals`
  );
}

export function updateEmergencyTransferWorkflow(referralId, status) {
  return guardedJson(
    'emergencyTransferWorkflow',
    `/api/emergency/transfers/${encodeURIComponent(referralId)}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }
  );
}

export function fetchEmergencyDiversionStatus() {
  return guardedJson('emergencyDiversionStatus', '/api/emergency/diversion/status');
}

export function createEmergencyEmsAlert(payload) {
  return guardedJson('emergencyEmsRuntime', '/api/emergency/ems/alert', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function updateEmergencyEmsStatus(emsUnitId, status, etaMinutes) {
  return guardedJson(
    'emergencyEmsRuntime',
    `/api/emergency/ems/status/${encodeURIComponent(emsUnitId)}`,
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status, eta_minutes: etaMinutes }),
    }
  );
}

export function confirmEmergencyEmsArrival(emsUnitId, arrivalDetails = {}) {
  return guardedJson(
    'emergencyEmsRuntime',
    `/api/emergency/ems/arrive/${encodeURIComponent(emsUnitId)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(arrivalDetails),
    }
  );
}

export function fetchIncomingEmergencyEms() {
  return guardedJson('emergencyEmsRuntime', '/api/emergency/ems/incoming');
}
