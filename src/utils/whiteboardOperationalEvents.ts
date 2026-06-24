import type { WhiteboardOperationalEventId } from '../config/edOperationalStandards';
import { WHITEBOARD_OPERATIONAL_ICONS } from '../config/edOperationalStandards';
import { calculateAnticipatedAdmissionScore } from '../engine/anticipatedAdmissionScore';
import type { BoardingSignals } from '../services/boardingSignals';
import { isPreArrivalPlaceholder } from '../services/preArrivalWorkflow';
import { PatientFlag, PatientState, type Patient, type Room } from '../types/emergency';
import { hasPatientFlag } from './patientVitals';

export type WhiteboardOperationalEvent = {
  id: WhiteboardOperationalEventId;
  label: string;
  glyph: string;
  tone: 'critical' | 'warning' | 'info' | 'neutral' | 'flow';
  detail?: string;
};

export function deriveWhiteboardOperationalEvents(
  patient: Patient,
  context: {
    room?: Room | null;
    consultPending?: boolean;
    resultsPending?: boolean;
    boardingSignals?: BoardingSignals | null;
  } = {},
): WhiteboardOperationalEvent[] {
  const events: WhiteboardOperationalEvent[] = [];
  const icon = (id: WhiteboardOperationalEventId, detail?: string) => {
    const spec = WHITEBOARD_OPERATIONAL_ICONS[id];
    events.push({
      id,
      label: spec.label,
      glyph: spec.glyph,
      tone: spec.tone,
      detail,
    });
  };

  if (isPreArrivalPlaceholder(patient) || patient.emsArrival?.status === 'Inbound') {
    const eta = patient.emsArrival?.eta;
    icon('pre-arrival', eta != null ? `ETA ${eta} min` : 'Inbound');
  }

  const automationEvents = patient.whiteboardAutomation?.events || [];
  automationEvents.forEach((timer) => {
    if (timer.id === 'mse-due') {
      icon(
        'mse-due',
        timer.overdueMinutes != null
          ? `Overdue ${timer.overdueMinutes}m`
          : timer.remainingMinutes != null
            ? `Due in ${timer.remainingMinutes}m`
            : 'Mental status review',
      );
      return;
    }
    if (timer.id === 'nurse-review-required') {
      icon('nurse-review-required', timer.overdueMinutes != null ? 'Result posted' : undefined);
      return;
    }
    if (timer.id === 'critical-labs') {
      icon('critical-labs', 'Critical value posted');
      return;
    }
    if (timer.id === 'results-review-required') {
      icon('results-pending', 'Clinician review outstanding');
    }
  });

  if (!automationEvents.some((timer) => timer.id === 'mse-due') && hasPatientFlag(patient, PatientFlag.PsychAlert)) {
    icon('mse-due', 'Mental status review');
  }

  if (
    !automationEvents.some((timer) => timer.id === 'nurse-review-required') &&
    (patient.triagePending ||
      patient.state === PatientState.Arrival ||
      patient.state === PatientState.Registration)
  ) {
    icon('nurse-review-required');
  }

  if (patient.state === PatientState.Admission || hasPatientFlag(patient, PatientFlag.PendingAdmission)) {
    icon('boarding');
    icon('awaiting-bed');
  }

  if (context.resultsPending || patient.state === PatientState.Results) {
    icon('results-pending');
  }

  if (context.consultPending) {
    icon('awaiting-consult');
  }

  if (hasPatientFlag(patient, PatientFlag.Isolation)) {
    icon('isolation');
  }

  if (hasPatientFlag(patient, PatientFlag.SepsisAlert)) {
    icon('sepsis-alert');
  }

  if (hasPatientFlag(patient, PatientFlag.HighRisk) && patient.state === PatientState.Waiting) {
    icon('fall-risk');
  }

  const room = context.room;
  if (room) {
    if (room.status === 'Available') icon('bed-clean');
    if (room.status === 'Cleaning') icon('bed-dirty');
    if (room.status === 'Occupied') icon('bed-occupied');
  }

  const adta = calculateAnticipatedAdmissionScore({
    patient,
    boardingSignals: context.boardingSignals,
  });
  if (adta.thresholdBreached) {
    icon('adta-elevated', `ADTA ${adta.score}`);
  }

  const seen = new Set<string>();
  return events.filter((event) => {
    if (seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  });
}