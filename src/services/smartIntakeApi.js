import { apiFetch, getApiErrorMessage, parseApiResponse } from './apiClient';

const jsonHeaders = { 'Content-Type': 'application/json' };

async function postJson(path, body) {
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
});

export default SmartIntakeApi;
