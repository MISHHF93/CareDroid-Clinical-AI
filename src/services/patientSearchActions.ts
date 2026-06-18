import { CANONICAL_ROUTES } from '../config/routes.config';
import { getExistingEncounterId } from './intakeEncounter';
import { completeIntakeHandoff, type IntakeHandoffStore } from './receptionHandoff';
import type { Patient } from '../types/emergency';

export type PatientSearchActionId = 'find' | 'intake' | 'view-encounter' | 'create-encounter';

export function getPatientEncounterId(patient?: Patient | null): string | null {
  return getExistingEncounterId(patient);
}

export function buildFindPatientPath(
  patientId: string,
  options: { receptionScoped?: boolean } = {},
): string {
  if (options.receptionScoped) {
    return `${CANONICAL_ROUTES.emergencyReception}?patientId=${encodeURIComponent(patientId)}`;
  }
  return `${CANONICAL_ROUTES.emergencyPatients}?patientId=${encodeURIComponent(patientId)}`;
}

export function buildViewEncounterPath(patientId: string, encounterId?: string | null): string {
  const params = new URLSearchParams({ patient: patientId });
  if (encounterId) params.set('encounter', encounterId);
  return `${CANONICAL_ROUTES.emergencyWhiteboard}?${params.toString()}`;
}

export function buildReceptionSearchFilterPath(query: string): string {
  const params = new URLSearchParams();
  if (query.trim()) params.set('q', query.trim());
  return params.toString()
    ? `${CANONICAL_ROUTES.emergencyReception}?${params.toString()}`
    : CANONICAL_ROUTES.emergencyReception;
}

export function createEncounterForPatient(
  store: IntakeHandoffStore,
  patientId: string,
  source: 'patient-search' | 'walk-in' = 'patient-search',
) {
  const handoffSource = source === 'walk-in' ? 'quick-intake' : 'patient-search';
  return completeIntakeHandoff(store, { patientId, source: handoffSource });
}
