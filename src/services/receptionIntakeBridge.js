import { CANONICAL_ROUTES } from '../config/routes.config';
import { getReceptionEmbeddedIntakePath } from '../config/emergencyRolePermissions';
import { useEmergencyStore } from '../store/emergencyStore';
import { enterEmsRegistrationQueue } from './queueAssignment';

/** Build session props for embedded Smart Intake on the reception workspace. */
export function buildReceptionIntakeSession(options = {}) {
  return {
    autostart: options.autostart !== false,
    step: options.step || null,
    patientId: options.patientId || null,
    mode: options.mode || null,
    emsArrivalId: options.emsArrivalId || null,
  };
}

export const RECEPTION_INTAKE_URL_KEYS = [
  'intake',
  'autostart',
  'step',
  'patientId',
  'mode',
  'emsArrivalId',
];

/**
 * Canonical EMS convert chain: chart shell → EMS registration queue → reception verify.
 * Keeps arrival-first continuity across whiteboard, EMS pipeline, and broadcast surfaces.
 */
export function convertEmsArrivalForReception(arrivalId, options = {}) {
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
