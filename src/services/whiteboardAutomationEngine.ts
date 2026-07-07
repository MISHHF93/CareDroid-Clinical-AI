import { isLegalTransition } from '../engine/journeyEngine';
import {
  PatientFlag,
  PatientState,
  type JourneyEvent,
  type Patient,
  type WhiteboardAutomationEventId,
  type WhiteboardAutomationSnapshot,
  type WhiteboardAutomationTimer,
} from '../types/emergency';

export type WhiteboardAutomationThresholds = {
  mseDueMinutes: number;
};

export const DEFAULT_WHITEBOARD_AUTOMATION_THRESHOLDS: WhiteboardAutomationThresholds = {
  mseDueMinutes: 120,
};

const PSYCH_COMPLAINT_PATTERN = /\b(psych|suicid|self[- ]harm|behavioral|mental|mse)\b/i;
const AUTOMATION_SOURCES = new Set([
  'whiteboard-automation',
  'physician-diagnosis',
  'lab-result-posted',
]);

function nowIso(now = new Date()): string {
  return now.toISOString();
}

function minutesBetween(startIso: string | undefined | null, now: Date): number | null {
  if (!startIso) return null;
  const start = new Date(startIso).getTime();
  if (!Number.isFinite(start)) return null;
  return Math.max(0, Math.round((now.getTime() - start) / 60000));
}

function minutesUntil(targetIso: string, now: Date): number {
  const target = new Date(targetIso).getTime();
  if (!Number.isFinite(target)) return 0;
  return Math.max(0, Math.ceil((target - now.getTime()) / 60000));
}

function getFlagDetectedAt(patient: Patient, flag: PatientFlag): string | null {
  for (const entry of patient.flags || []) {
    if (typeof entry === 'string') {
      if (entry === flag) return patient.triageTime || patient.arrivalTime || null;
      continue;
    }
    if ((entry as unknown as { type: string })?.type === flag) return (entry as unknown as { detectedAt?: string }).detectedAt || null;
  }
  return null;
}

function hasFlag(patient: Patient, flag: PatientFlag): boolean {
  return (patient.flags || []).some((entry) =>
    typeof entry === 'string' ? entry === flag : (entry as unknown as { type: string })?.type === flag,
  );
}

function timelineEvents(patient: Patient, type?: JourneyEvent['type']): JourneyEvent[] {
  const events = patient.timeline || [];
  if (!type) return events;
  return events.filter((event) => event.type === type);
}

function latestTimelineEvent(
  patient: Patient,
  types: JourneyEvent['type'][] = [],
): JourneyEvent | null {
  const events = timelineEvents(patient).filter((event) =>
    types.length ? types.includes(event.type) : true,
  );
  if (!events.length) return null;
  return [...events].sort(
    (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
  )[0];
}

function pendingResultCount(patient: Patient): number {
  const orders = timelineEvents(patient, 'OrderPlaced').length;
  const results = timelineEvents(patient, 'ResultReceived').length;
  return Math.max(0, orders - results);
}

function latestUnreviewedResult(patient: Patient): JourneyEvent | null {
  const results = timelineEvents(patient, 'ResultReceived');
  if (!results.length) return null;

  const reviewedAfter = timelineEvents(patient).filter(
    (event) =>
      event.type === 'StateChange' && event.metadata?.automation === 'lab-result-reviewed',
  );

  const latestReview = reviewedAfter.at(-1);
  const candidates = [...results].sort(
    (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
  );

  if (!latestReview) return candidates[0] || null;

  const reviewTime = new Date(latestReview.timestamp).getTime();
  return (
    candidates.find((result) => new Date(result.timestamp).getTime() > reviewTime) || null
  );
}

function hasAutomationHandled(
  patient: Patient,
  automation: string,
  anchorEventId?: string,
): boolean {
  return timelineEvents(patient).some(
    (event) =>
      event.metadata?.automation === automation &&
      (!anchorEventId || event.metadata?.anchorEventId === anchorEventId),
  );
}

function isPsychiatricPathway(patient: Patient): boolean {
  return (
    hasFlag(patient, PatientFlag.PsychAlert) ||
    PSYCH_COMPLAINT_PATTERN.test(patient.chiefComplaint || '') ||
    PSYCH_COMPLAINT_PATTERN.test(patient.complaintCategory || '')
  );
}

function psychAnchorTime(patient: Patient): string {
  return (
    getFlagDetectedAt(patient, PatientFlag.PsychAlert) ||
    patient.triageTime ||
    patient.arrivalTime ||
    nowIso()
  );
}

function buildTimer(
  id: WhiteboardAutomationEventId,
  label: string,
  dueAt: string,
  source: string,
  tone: WhiteboardAutomationTimer['tone'],
  now: Date,
  triggeredAt?: string,
): WhiteboardAutomationTimer {
  const remainingMinutes = minutesUntil(dueAt, now);
  const overdueMinutes = new Date(dueAt).getTime() <= now.getTime()
    ? minutesBetween(dueAt, now) || 0
    : undefined;

  return {
    id,
    label,
    dueAt,
    triggeredAt,
    source,
    tone,
    remainingMinutes: overdueMinutes ? 0 : remainingMinutes,
    overdueMinutes,
  };
}

function makeAutomationEvent(
  patient: Patient,
  type: JourneyEvent['type'],
  summary: string,
  timestamp: string,
  extra: Partial<JourneyEvent> = {},
): JourneyEvent {
  return {
    id: `evt-auto-${patient.id}-${type}-${timestamp}`,
    patientId: patient.id,
    type,
    timestamp,
    to: patient.state,
    summary,
    ...extra,
  };
}

export function evaluateWhiteboardAutomation(
  patient: Patient,
  now = new Date(),
  thresholds: WhiteboardAutomationThresholds = DEFAULT_WHITEBOARD_AUTOMATION_THRESHOLDS,
): WhiteboardAutomationSnapshot {
  const events: WhiteboardAutomationTimer[] = [];
  const timestamp = nowIso(now);

  if (isPsychiatricPathway(patient) && patient.state !== PatientState.Discharge) {
    const anchor = psychAnchorTime(patient);
    const dueAt = new Date(
      new Date(anchor).getTime() + thresholds.mseDueMinutes * 60_000,
    ).toISOString();
    const overdue = new Date(dueAt).getTime() <= now.getTime();
    events.push(
      buildTimer(
        'mse-due',
        overdue ? 'MSE due' : 'MSE due soon',
        dueAt,
        'psych-pathway-timer',
        overdue ? 'warning' : 'info',
        now,
        anchor,
      ),
    );
  }

  const needsReassessmentReview =
    hasFlag(patient, PatientFlag.ReassessmentDue) ||
    hasFlag(patient, PatientFlag.DeteriorationRisk) ||
    hasFlag(patient, PatientFlag.ScoreReassessmentRecommended);

  if (needsReassessmentReview && patient.state !== PatientState.Discharge) {
    const anchor =
      getFlagDetectedAt(patient, PatientFlag.ReassessmentDue) ||
      getFlagDetectedAt(patient, PatientFlag.DeteriorationRisk) ||
      patient.arrivalTime ||
      timestamp;
    events.push(
      buildTimer(
        'nurse-review-required',
        'Awaiting nurse review',
        anchor,
        'reassessment-escalation',
        'warning',
        now,
        anchor,
      ),
    );
  }

  const unreviewedResult = latestUnreviewedResult(patient);
  if (unreviewedResult) {
    const isCritical = Boolean(unreviewedResult.metadata?.critical);
    events.push(
      buildTimer(
        isCritical ? 'critical-labs' : 'nurse-review-required',
        isCritical ? 'Critical labs' : 'Nurse review required',
        unreviewedResult.timestamp,
        'lab-result-posted',
        isCritical ? 'critical' : 'warning',
        now,
        unreviewedResult.timestamp,
      ),
    );
  } else if (
    patient.state === PatientState.Results ||
    pendingResultCount(patient) > 0
  ) {
    events.push(
      buildTimer(
        'results-review-required',
        'Results review required',
        latestTimelineEvent(patient, ['ResultReceived'])?.timestamp || timestamp,
        'results-pending',
        'warning',
        now,
      ),
    );
  }

  const diagnosisEvent = latestTimelineEvent(patient, ['DispositionUpdated']);
  if (
    diagnosisEvent?.metadata?.diagnosis &&
    [PatientState.Disposition, PatientState.Assessment, PatientState.Results, PatientState.Orders].includes(
      patient.state,
    )
  ) {
    events.push(
      buildTimer(
        'awaiting-disposition',
        'Awaiting disposition',
        diagnosisEvent.timestamp,
        'physician-diagnosis',
        'flow',
        now,
        diagnosisEvent.timestamp,
      ),
    );
  } else if (patient.state === PatientState.Disposition) {
    events.push(
      buildTimer(
        'awaiting-disposition',
        'Awaiting disposition',
        latestTimelineEvent(patient, ['StateChange', 'DispositionUpdated'])?.timestamp || timestamp,
        'disposition-queue',
        'flow',
        now,
      ),
    );
  }

  let displayState: string | undefined;
  const mseTimer = events.find((event) => event.id === 'mse-due');
  const nurseReview = events.find(
    (event) => event.id === 'nurse-review-required' || event.id === 'critical-labs',
  );
  const dispositionTimer = events.find((event) => event.id === 'awaiting-disposition');

  if (patient.state === PatientState.Disposition || dispositionTimer) {
    displayState = 'Awaiting Disposition';
  } else if (nurseReview?.id === 'critical-labs') {
    displayState = 'Critical Labs';
  } else if (nurseReview) {
    displayState = 'Nurse Review Required';
  } else if (mseTimer?.overdueMinutes != null) {
    displayState = 'MSE Due';
  } else if (mseTimer?.remainingMinutes != null && mseTimer.remainingMinutes <= 30) {
    displayState = `MSE · ${mseTimer.remainingMinutes}m`;
  } else if (patient.state === PatientState.Results) {
    displayState = 'Results Review';
  }

  return {
    events,
    displayState,
    updatedAt: timestamp,
  };
}

function automationSnapshotsEqual(
  left?: WhiteboardAutomationSnapshot,
  right?: WhiteboardAutomationSnapshot,
): boolean {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return (
    left.displayState === right.displayState &&
    JSON.stringify(left.events) === JSON.stringify(right.events)
  );
}

function applyAutomatedStateTransitions(
  patient: Patient,
  now: Date,
): { patient: Patient; changed: boolean } {
  let nextPatient = patient;
  let changed = false;
  const timestamp = nowIso(now);

  const latestResult = latestUnreviewedResult(patient);
  if (
    latestResult &&
    patient.state === PatientState.Orders &&
    !hasAutomationHandled(patient, 'lab-result-to-results', latestResult.id)
  ) {
    const targetState = PatientState.Results;
    if (isLegalTransition(patient.state, targetState)) {
      changed = true;
      nextPatient = {
        ...nextPatient,
        state: targetState,
        timeline: [
          ...(nextPatient.timeline || []),
          makeAutomationEvent(
            nextPatient,
            'StateChange',
            'Automated whiteboard update: lab result posted — nurse review required.',
            timestamp,
            {
              from: patient.state,
              to: targetState,
              metadata: {
                automation: 'lab-result-to-results',
                anchorEventId: latestResult.id,
                source: 'whiteboard-automation',
              },
            },
          ),
        ],
      };
    }
  }

  const diagnosisEvent = latestTimelineEvent(patient, ['DispositionUpdated']);
  const diagnosis = String(diagnosisEvent?.metadata?.diagnosis || '').trim();
  if (
    diagnosis &&
    diagnosisEvent &&
    !hasAutomationHandled(patient, 'diagnosis-to-disposition', diagnosisEvent.id) &&
    [PatientState.Assessment, PatientState.Orders, PatientState.Results, PatientState.Waiting].includes(
      nextPatient.state,
    )
  ) {
    const targetState = PatientState.Disposition;
    if (isLegalTransition(nextPatient.state, targetState)) {
      changed = true;
      nextPatient = {
        ...nextPatient,
        state: targetState,
        timeline: [
          ...(nextPatient.timeline || []),
          makeAutomationEvent(
            nextPatient,
            'StateChange',
            `Automated whiteboard update: diagnosis recorded — awaiting disposition (${diagnosis}).`,
            timestamp,
            {
              from: nextPatient.state,
              to: targetState,
              actorStaffId: String(diagnosisEvent.actorStaffId || diagnosisEvent.staffId || ''),
              metadata: {
                automation: 'diagnosis-to-disposition',
                anchorEventId: diagnosisEvent.id,
                diagnosis,
                source: 'whiteboard-automation',
              },
            },
          ),
        ],
      };
    }
  }

  return { patient: nextPatient, changed };
}

export function applyWhiteboardAutomationToPatients(
  patients: Patient[],
  now = new Date(),
  thresholds: WhiteboardAutomationThresholds = DEFAULT_WHITEBOARD_AUTOMATION_THRESHOLDS,
): Patient[] {
  let changed = false;

  const nextPatients = patients.map((patient) => {
    if ([PatientState.Discharge, PatientState.Deceased].includes(patient.state)) {
      if (!patient.whiteboardAutomation) return patient;
      changed = true;
      return { ...patient, whiteboardAutomation: undefined };
    }

    const { patient: transitioned, changed: transitionChanged } = applyAutomatedStateTransitions(
      patient,
      now,
    );
    const automation = evaluateWhiteboardAutomation(transitioned, now, thresholds);
    const automationChanged = !automationSnapshotsEqual(
      transitioned.whiteboardAutomation,
      automation,
    );

    if (!transitionChanged && !automationChanged) {
      return patient;
    }

    changed = true;
    return {
      ...transitioned,
      whiteboardAutomation: automation,
    };
  });

  return changed ? nextPatients : patients;
}

export type PhysicianDiagnosisInput = {
  diagnosis: string;
  physicianId?: string;
  physicianName?: string;
};

export function buildPhysicianDiagnosisPatch(
  patient: Patient,
  input: PhysicianDiagnosisInput,
  now = new Date(),
): Patient | null {
  const diagnosis = input.diagnosis.trim();
  if (!diagnosis) return null;

  const timestamp = nowIso(now);
  const diagnosisEvent = makeAutomationEvent(
    patient,
    'DispositionUpdated',
    `Physician diagnosis recorded: ${diagnosis}`,
    timestamp,
    {
      actorStaffId: input.physicianId,
      staffId: input.physicianId,
      metadata: {
        diagnosis,
        physicianName: input.physicianName || null,
        source: 'physician-diagnosis',
      },
    },
  );

  let nextPatient: Patient = {
    ...patient,
    assignedPhysicianId: input.physicianId || patient.assignedPhysicianId || null,
    timeline: [...(patient.timeline || []), diagnosisEvent],
  };

  const { patient: transitioned } = applyAutomatedStateTransitions(nextPatient, now);
  nextPatient = {
    ...transitioned,
    whiteboardAutomation: evaluateWhiteboardAutomation(transitioned, now),
  };

  return nextPatient;
}

export type LabResultPostedInput = {
  summary?: string;
  critical?: boolean;
  analyte?: string;
  actorId?: string;
};

export function buildLabResultPostedPatch(
  patient: Patient,
  input: LabResultPostedInput = {},
  now = new Date(),
): Patient {
  const timestamp = nowIso(now);
  const resultEvent = makeAutomationEvent(
    patient,
    'ResultReceived',
    input.summary || 'Laboratory result posted',
    timestamp,
    {
      actorStaffId: input.actorId,
      metadata: {
        critical: Boolean(input.critical),
        analyte: input.analyte || null,
        source: 'lab-result-posted',
      },
    },
  );

  const withResult: Patient = {
    ...patient,
    timeline: [...(patient.timeline || []), resultEvent],
  };

  const { patient: transitioned } = applyAutomatedStateTransitions(withResult, now);
  return {
    ...transitioned,
    whiteboardAutomation: evaluateWhiteboardAutomation(transitioned, now),
  };
}

export function summarizeWhiteboardAutomationSource(event: JourneyEvent): boolean {
  const source = String(event.metadata?.source || '');
  return AUTOMATION_SOURCES.has(source) || String(event.metadata?.automation || '').length > 0;
}