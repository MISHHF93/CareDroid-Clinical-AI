/**
 * Canonical patient workflow navigation — carries context across ED surfaces
 * without duplicate data entry or patient re-selection.
 */
import {
  resolveLegalNextStates,
  resolveWorkflowRouteForState,
  resolveWorkflowStepForState,
  type PatientWorkflowStep,
} from '../config/unifiedPatientWorkflowModel';
import { type Patient } from '../types/emergency';

export type PatientWorkflowNavigationContext = Readonly<{
  patientId?: string;
  encounterId?: string | null;
  queue?: string;
}>;

export function appendPatientWorkflowContext(
  route: string,
  context: PatientWorkflowNavigationContext = {},
): string {
  const trimmed = String(route || '/').trim();
  if (!trimmed) return '/';

  const hashIndex = trimmed.indexOf('#');
  const hash = hashIndex >= 0 ? trimmed.slice(hashIndex) : '';
  const withoutHash = hashIndex >= 0 ? trimmed.slice(0, hashIndex) : trimmed;
  const [pathname, search = ''] = withoutHash.split('?');
  const params = new URLSearchParams(search);

  if (context.patientId) {
    if (!params.has('patient') && !params.has('patientId')) {
      params.set('patient', context.patientId);
    }
  }
  if (context.encounterId && !params.has('encounter')) {
    params.set('encounter', context.encounterId);
  }
  if (context.queue && !params.has('queue')) {
    params.set('queue', context.queue);
  }

  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ''}${hash}`;
}

export function resolvePatientWorkflowRoute(
  patient: Patient,
  options: { encounterId?: string | null; queue?: string } = {},
): string {
  const base = resolveWorkflowRouteForState(patient.state, patient.id);
  const encounterId =
    options.encounterId ??
    (patient as Patient & { encounterId?: string }).encounterId ??
    null;
  return appendPatientWorkflowContext(base, {
    patientId: patient.id,
    encounterId,
    queue: options.queue,
  });
}

export function resolvePatientWorkflowStep(patient: Patient): PatientWorkflowStep | null {
  return resolveWorkflowStepForState(patient.state);
}

export function resolveNextWorkflowRouteForPatient(patient: Patient): string | null {
  const nextState = resolveLegalNextStates(patient.state)[0];
  if (!nextState) return null;
  return resolvePatientWorkflowRoute({ ...patient, state: nextState });
}

export function buildPhaseRouteWithPatientContext(
  phaseRoute: string,
  context: PatientWorkflowNavigationContext = {},
): string {
  if (!context.patientId) return phaseRoute;
  return appendPatientWorkflowContext(phaseRoute, context);
}