/**
 * Patient-context hard gate at LLM egress.
 *
 * Default: AI_PATIENT_CONTEXT_ENABLED is false — strip patient identifiers and
 * chart-shaped context before PHI minimize / provider call.
 * Not a full de-identification pipeline; prefer leaving the flag off in prod.
 */

import type { AIRequest } from '../llmTransport';

const PATIENT_CONTEXT_KEYS = new Set([
  'patient',
  'patientchart',
  'patient_chart',
  'chart',
  'mrn',
  'demographics',
  'fullname',
  'full_name',
  'dateofbirth',
  'date_of_birth',
  'dob',
  'ssn',
  'patientid',
  'patient_id',
  'encounterid',
  'encounter_id',
  'phi',
  'identifiers',
]);

export interface PatientContextGateResult {
  request: AIRequest;
  stripped: boolean;
  strippedFields: string[];
  patientContextEnabled: boolean;
}

export function isPatientContextEnabled(
  env: Record<string, string | undefined> = typeof process !== 'undefined' ? process.env : {},
): boolean {
  const raw = env.AI_PATIENT_CONTEXT_ENABLED;
  return raw === '1' || raw === 'true' || raw === 'TRUE' || raw === 'yes';
}

/**
 * When patient context is disabled, remove identifiers that should never leave
 * the egress boundary on an external LLM call.
 */
export function applyPatientContextGate(request: AIRequest): PatientContextGateResult {
  const enabled = isPatientContextEnabled();
  if (enabled) {
    return {
      request,
      stripped: false,
      strippedFields: [],
      patientContextEnabled: true,
    };
  }

  const strippedFields: string[] = [];
  const next: AIRequest = { ...request };

  if (next.patientId != null && String(next.patientId).length > 0) {
    strippedFields.push('patientId');
    delete next.patientId;
  }
  if (next.encounterId != null && String(next.encounterId).length > 0) {
    strippedFields.push('encounterId');
    delete next.encounterId;
  }

  if (next.context && typeof next.context === 'object') {
    const ctx: Record<string, unknown> = { ...next.context };
    let contextChanged = false;
    for (const key of Object.keys(ctx)) {
      if (PATIENT_CONTEXT_KEYS.has(key.toLowerCase())) {
        strippedFields.push(`context.${key}`);
        delete ctx[key];
        contextChanged = true;
      }
    }
    if (contextChanged) {
      next.context = ctx;
    }
  }

  return {
    request: next,
    stripped: strippedFields.length > 0,
    strippedFields,
    patientContextEnabled: false,
  };
}
