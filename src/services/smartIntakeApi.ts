import { apiFetch, ApiResponseError, getApiErrorMessage, parseApiResponse } from './apiClient';
import { isBackendCapabilityEnabled } from '../config/backendApiCapabilities';
import { SMART_INTAKE_DEMO } from '../data/smartIntakeFixtures';

const jsonHeaders = { 'Content-Type': 'application/json' };
const SMART_INTAKE_UNAVAILABLE_MESSAGE = 'Backend Smart Intake endpoint is not available yet.';
const SMART_INTAKE_INVALID_RESPONSE_MESSAGE =
  'The API did not return a valid response. Check backend availability or the request mock.';

function assertValidApiResponse(response) {
  if (!response || typeof response.text !== 'function') {
    throw new ApiResponseError(SMART_INTAKE_INVALID_RESPONSE_MESSAGE, {
      status: response?.status || 0,
      statusText: response?.statusText || '',
      url: response?.url || '',
      contentType: '',
    });
  }
}

function liveIdentitySessionsEnabled() {
  // Identity session controller may be disabled while smart-intake demo envelope remains available.
  return (
    isBackendCapabilityEnabled('emergencySmartIntakeIdentitySession') ||
    isBackendCapabilityEnabled('emergencySmartIntake')
  );
}

function demoSessionResult(staff = 'Current staff') {
  return {
    ok: true,
    localDemo: true,
    sessionId: SMART_INTAKE_DEMO.sessionId,
    data: {
      sessionId: SMART_INTAKE_DEMO.sessionId,
      staff,
      status: 'local-demo',
      steps: SMART_INTAKE_DEMO.steps,
      extractedFields: SMART_INTAKE_DEMO.extractedFields,
      candidates: SMART_INTAKE_DEMO.candidates,
    },
    message: 'Using local identity-check demo session (live intake session API offline).',
  };
}

function demoOk(extra: Record<string, unknown> = {}) {
  return {
    ok: true,
    localDemo: true,
    ...extra,
    message: 'Saved in local desk demo mode.',
  };
}

async function postJson(path, body) {
  if (!liveIdentitySessionsEnabled()) {
    // Soft local path — reception identity check must not hard-fail offline.
    if (String(path).endsWith('/sessions') || String(path).includes('/sessions')) {
      return demoSessionResult(body?.staff);
    }
    return demoOk({ path, body });
  }

  const response = await apiFetch(path, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(body),
  });
  assertValidApiResponse(response);
  const payload = await parseApiResponse(response);
  if (!response?.ok) {
    // Prefer local demo over hard failure for desk continuity
    if (response.status === 401 || response.status === 404 || response.status === 501) {
      if (String(path).includes('/sessions') && !String(path).includes('/sessions/')) {
        return demoSessionResult(body?.staff);
      }
      return demoOk({ path, body, degraded: true });
    }
    throw new Error(payload?.error || payload?.message || getApiErrorMessage(null, response));
  }
  return payload;
}

async function getJson(path) {
  if (!liveIdentitySessionsEnabled()) {
    return demoOk({
      sessionId: SMART_INTAKE_DEMO.sessionId,
      auditLog: SMART_INTAKE_DEMO.auditLog,
    });
  }

  const response = await apiFetch(path);
  assertValidApiResponse(response);
  const payload = await parseApiResponse(response);
  if (!response?.ok) {
    if (response.status === 401 || response.status === 404) {
      return demoOk({
        sessionId: SMART_INTAKE_DEMO.sessionId,
        auditLog: SMART_INTAKE_DEMO.auditLog,
        degraded: true,
      });
    }
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
    return postJson(`/api/emergency/intake/${sessionId}/match`, { staff }).then((result) => {
      if (result?.localDemo) {
        return {
          ...result,
          candidates: SMART_INTAKE_DEMO.candidates,
          data: {
            ...(result.data || {}),
            candidates: SMART_INTAKE_DEMO.candidates,
          },
        };
      }
      return result;
    });
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
