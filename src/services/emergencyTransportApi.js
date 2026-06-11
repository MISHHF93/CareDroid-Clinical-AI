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
