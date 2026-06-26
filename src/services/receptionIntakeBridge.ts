import { CANONICAL_ROUTES } from '../config/routes.config';
import { getReceptionEmbeddedIntakePath } from '../config/emergencyRolePermissions';
import { useEmergencyStore } from '../store/emergencyStore';
import { enterEmsRegistrationQueue } from './queueAssignment';

/** Build session props for embedded Smart Intake on the reception workspace. */
export function buildReceptionIntakeSession(options: any = {}) {
  return {
    autostart: options.autostart !== false,
    step: options.step || null,
    patientId: options.patientId || null,
    mode: options.mode || null,
    emsArrivalId: options.emsArrivalId || null,
    artifactId: options.artifactId || null,
  };
}

export const RECEPTION_INTAKE_URL_KEYS = [
  'intake',
  'autostart',
  'step',
  'patientId',
  'mode',
  'emsArrivalId',
  'artifactId',
];

/**
 * Reception pipeline URL contract (deep links into ReceptionWorkspace panels).
 *
 * | Param              | Panel / behavior                          |
 * |--------------------|-------------------------------------------|
 * | express=1          | Reception quick intake modal              |
 * | quickIntake=1      | Reception quick intake modal              |
 * | intake=1           | Smart intake overlay                      |
 * | quickCreate=1      | Reception quick intake modal              |
 * | queue=ems          | Work queues — EMS tab                     |
 * | queue=verification | Work queues — identity verification tab   |
 * | queue=pretriage    | Work queues — pre-triage / handoff tab    |
 * | patientId          | Search context + selected patient         |
 * | q                  | Patient search query                      |
 * | arrived            | Arrival confirmation banner context       |
 * | patient            | Expanded pretriage queue row              |
 */
export const RECEPTION_PIPELINE_URL_CONTRACT = Object.freeze({
  express: 'Reception quick intake',
  quickIntake: 'Reception quick intake',
  intake: 'Smart intake overlay',
  quickCreate: 'Reception quick intake',
  'queue=ems': 'EMS work queue tab',
  'queue=verification': 'Identity verification queue tab',
  'queue=pretriage': 'Pre-triage / handoff queue tab',
  patientId: 'Selected patient search context',
  q: 'Patient search query',
  arrived: 'Arrival confirmation context',
  patient: 'Expanded pretriage queue row',
});

/**
 * Canonical EMS convert chain: chart shell → EMS registration queue → reception verify.
 * Keeps arrival-first continuity across whiteboard, EMS pipeline, and broadcast surfaces.
 */
export function convertEmsArrivalForReception(arrivalId, options: any = {}) {
  const store = useEmergencyStore.getState();
  const arrival = store.emsArrivals.find((entry) => entry.id === arrivalId);
  if (!arrival) {
    return { ok: false, reason: 'not_found' };
  }
  if (arrival.patientId) {
    return {
      ok: true,
      alreadyConverted: true,
      patientId: arrival.patientId,
      emsArrivalId: arrivalId,
      receptionVerifyPath: getReceptionEmbeddedIntakePath({
        step: 'verify',
        patientId: arrival.patientId,
        emsArrivalId: arrivalId,
      }),
    };
  }

  store.convertEMSArrivalToPatient(arrivalId);
  const after = useEmergencyStore.getState();
  const converted = after.emsArrivals.find((entry) => entry.id === arrivalId);
  const patientId = converted?.patientId;
  if (!patientId) {
    return { ok: false, reason: 'conversion_failed' };
  }

  enterEmsRegistrationQueue(after, {
    patientId,
    emsArrivalId: arrivalId,
    actorName: options.actorName,
  });

  after.registerArrivalControl?.(patientId, {
    source: 'ems-convert',
    destination: 'ems-registration',
  });

  const receptionVerifyPath = getReceptionEmbeddedIntakePath({
    step: 'verify',
    patientId,
    emsArrivalId: arrivalId,
  });

  return {
    ok: true,
    patientId,
    emsArrivalId: arrivalId,
    receptionVerifyPath,
    whiteboardPath: `${CANONICAL_ROUTES.emergencyWhiteboard}?patient=${encodeURIComponent(patientId)}`,
  };
}
