import { apiFetch, getApiErrorMessage, parseApiResponse } from './apiClient';
import { isBackendCapabilityEnabled } from '../config/backendApiCapabilities';

const jsonHeaders = { 'Content-Type': 'application/json' };
const SMART_INTAKE_UNAVAILABLE_MESSAGE = 'Backend Smart Intake endpoint is not available yet.';

async function postJson(path, body) {
  if (!isBackendCapabilityEnabled('emergencySmartIntakeIdentitySession')) {
    throw new Error(SMART_INTAKE_UNAVAILABLE_MESSAGE);
  }

  const response = await apiFetch(path, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(body),
  });
  const payload = await parseApiResponse(response);
  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || getApiErrorMessage(null, response));
  }
  return payload;
}

async function getJson(path) {
  if (!isBackendCapabilityEnabled('emergencySmartIntakeIdentitySession')) {
    throw new Error(SMART_INTAKE_UNAVAILABLE_MESSAGE);
  }

  const response = await apiFetch(path);
  const payload = await parseApiResponse(response);
  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || getApiErrorMessage(null, response));
  }
  return payload;
}

export const SmartIntakeApi = Object.freeze({
  createSession(staff = 'Current staff') {
    return postJson('/api/emergency/intake/sessions', { staff });
  },
  submitManualEntry(sessionId, manual, staff = 'Current staff') {
    return postJson(`/api/emergency/intake/${sessionId}/manual-entry`, { manual, staff });
  },
  uploadDocument(sessionId, document, staff = 'Current staff') {
    return postJson(`/api/emergency/intake/${sessionId}/documents`, { document, staff });
  },
  submitOcrResult(sessionId, payload, staff = 'Current staff') {
    return postJson(`/api/emergency/intake/${sessionId}/ocr-results`, { ...payload, staff });
  },
  matchPatient(sessionId, staff = 'Current staff') {
    return postJson(`/api/emergency/intake/${sessionId}/match`, { staff });
  },
  verifyField(sessionId, field, decision, editedValue, staff = 'Current staff') {
    return postJson(`/api/emergency/intake/${sessionId}/verify-field`, {
      field,
      decision,
      edited_value: editedValue,
      staff,
    });
  },
  linkPatient(sessionId, patientId, staff = 'Current staff') {
    return postJson(`/api/emergency/intake/${sessionId}/link-patient`, { patientId, staff });
  },
  createPatient(sessionId, staff = 'Current staff') {
    return postJson(`/api/emergency/intake/${sessionId}/create-patient`, { staff });
  },
  continueUnknown(sessionId, label = 'Unknown Patient', staff = 'Current staff') {
    return postJson(`/api/emergency/intake/${sessionId}/continue-unknown`, { label, staff });
  },
  addEmsEvidence(sessionId, ems, staff = 'Current staff') {
    return postJson(`/api/emergency/intake/${sessionId}/ems-evidence`, { ems, staff });
  },
  reconcileUnknown(sessionId, patientId, staff = 'Current staff') {
    return postJson(`/api/emergency/intake/${sessionId}/reconcile-unknown`, { patientId, staff });
  },
  captureBiometricConsent(sessionId, consent, staff = 'Current staff') {
    return postJson(`/api/emergency/intake/${sessionId}/biometric-consent`, { ...consent, staff });
  },
  withdrawBiometricConsent(sessionId, staff = 'Current staff') {
    return postJson(`/api/emergency/intake/${sessionId}/biometric-consent/withdraw`, { staff });
  },
  fetchAuditLog(sessionId) {
    return getJson(`/api/emergency/intake/${sessionId}/audit-log`);
  },
});

export default SmartIntakeApi;
