import { CANONICAL_ROUTES } from '../config/routes.config';
import { getReceptionEmbeddedIntakePath } from '../config/emergencyRolePermissions';
import { useEmergencyStore } from '../store/emergencyStore';
import { enterEmsRegistrationQueue } from './queueAssignment';
import { ErrorCode, err, ok, resultError, type Result } from '../contracts/results';

export type ReceptionIntakeSessionOptions = {
  autostart?: boolean;
  step?: string | null;
  patientId?: string | null;
  mode?: string | null;
  emsArrivalId?: string | null;
  artifactId?: string | null;
};

export type ReceptionIntakeSession = {
  autostart: boolean;
  step: string | null;
  patientId: string | null;
  mode: string | null;
  emsArrivalId: string | null;
  artifactId: string | null;
};

/** Build session props for embedded Smart Intake on the reception workspace. */
export function buildReceptionIntakeSession(
  options: ReceptionIntakeSessionOptions = {},
): ReceptionIntakeSession {
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
] as const;

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

export type ConvertEmsArrivalSuccess = {
  patientId: string;
  emsArrivalId: string;
  receptionVerifyPath: string;
  whiteboardPath?: string;
  alreadyConverted?: boolean;
};

export type ConvertEmsArrivalOptions = {
  actorName?: string;
};

/**
 * Canonical EMS convert chain: chart shell → EMS registration queue → reception verify.
 * Returns canonical Result — never silent success on missing arrival.
 */
export function convertEmsArrivalForReception(
  arrivalId: string,
  options: ConvertEmsArrivalOptions = {},
): Result<ConvertEmsArrivalSuccess> {
  const store = useEmergencyStore.getState();
  const arrivals = store.emsArrivals ?? [];
  const arrival = arrivals.find((entry) => entry.id === arrivalId);
  if (!arrival) {
    return err(
      resultError(ErrorCode.NOT_FOUND, 'EMS arrival not found', {
        detail: 'not_found',
      }),
    );
  }
  if (arrival.patientId) {
    return ok({
      alreadyConverted: true,
      patientId: arrival.patientId,
      emsArrivalId: arrivalId,
      receptionVerifyPath: getReceptionEmbeddedIntakePath({
        step: 'verify',
        patientId: arrival.patientId,
        emsArrivalId: arrivalId,
      }),
    });
  }

  store.convertEMSArrivalToPatient(arrivalId);
  const after = useEmergencyStore.getState();
  const converted = (after.emsArrivals ?? []).find((entry) => entry.id === arrivalId);
  const patientId = converted?.patientId;
  if (!patientId) {
    return err(
      resultError(ErrorCode.INTERNAL, 'EMS arrival conversion failed', {
        detail: 'conversion_failed',
      }),
    );
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

  void import('./emergencyCareJourneyOrchestrator')
    .then(({ onPatientArrivalAtReception, resolveLinkedCallIdForEmsArrival }) =>
      onPatientArrivalAtReception(patientId, {
        callId: resolveLinkedCallIdForEmsArrival(arrival),
        emsArrivalId: arrivalId,
        actorName: options.actorName,
      }),
    )
    .catch(() => {
      // Journey orchestrator is non-blocking; conversion already succeeded.
    });

  return ok({
    patientId,
    emsArrivalId: arrivalId,
    receptionVerifyPath,
    whiteboardPath: `${CANONICAL_ROUTES.emergencyWhiteboard}?patient=${encodeURIComponent(patientId)}`,
  });
}
