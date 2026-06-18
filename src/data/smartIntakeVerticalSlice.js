import { PatientState, Priority } from '../types/emergency';

export const SMART_INTAKE_VERTICAL_SLICE_FIXTURE = Object.freeze({
  staffId: 'staff-smart-intake-rn',
  patientId: 'smart-intake-slice-demo',
  mrn: 'ED-SLICE-001',
  firstName: 'Avery',
  lastName: 'Stone',
  dob: '1978-03-01',
  sex: 'Female',
  complaintCategory: 'Chest Pain',
  complaintText: 'Chest pressure with diaphoresis',
  priority: Priority.P2,
  vitals: Object.freeze({
    hr: '128',
    bpSystolic: '144',
    spo2: '97',
    temp: '36.8',
  }),
});

function parseNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeSmartIntakeVitals(vitals = {}, recordedAt = new Date().toISOString()) {
  return {
    hr: parseNumber(vitals.hr),
    bpSystolic: parseNumber(vitals.bpSystolic ?? vitals.sbp),
    bpDiastolic: parseNumber(vitals.bpDiastolic ?? vitals.dbp),
    spo2: parseNumber(vitals.spo2),
    temp: parseNumber(vitals.temp),
    rr: parseNumber(vitals.rr),
    gcs: parseNumber(vitals.gcs),
    pain: parseNumber(vitals.pain),
    recordedAt,
  };
}

export function shouldTriggerSmartIntakeReassessment(priority, vitals = {}) {
  const normalized = normalizeSmartIntakeVitals(vitals);
  return (
    priority === Priority.P1 ||
    priority === Priority.P2 ||
    (normalized.hr !== null && (normalized.hr < 50 || normalized.hr > 120)) ||
    (normalized.bpSystolic !== null && normalized.bpSystolic < 90) ||
    (normalized.spo2 !== null && normalized.spo2 < 94) ||
    (normalized.temp !== null && normalized.temp > 38.5) ||
    (normalized.pain !== null && normalized.pain >= 8)
  );
}

function createFlag(type, reason, severity, detectedAt) {
  return { type, reason, severity, detectedAt };
}

export function buildSmartIntakeVerticalSlicePatient({
  patientId,
  mrn,
  identity = {},
  age = 0,
  complaintCategory = 'Other',
  complaintText = 'Smart Intake identity review',
  vitals = {},
  selectedPriority = Priority.P3,
  autoSuggestion = {},
  triageSuggestion = {},
  sessionId = null,
  staffId = SMART_INTAKE_VERTICAL_SLICE_FIXTURE.staffId,
  timestamp = new Date().toISOString(),
  source = 'Smart Intake',
} = {}) {
  const id = patientId || `smart-intake-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const normalizedVitals = normalizeSmartIntakeVitals(vitals, timestamp);
  const reassessmentNeeded = shouldTriggerSmartIntakeReassessment(selectedPriority, normalizedVitals);
  const flags = [];

  if (selectedPriority === Priority.P1 || selectedPriority === Priority.P2) {
    flags.push(
      createFlag(
        'HighRisk',
        `${source} assigned ${selectedPriority} priority.`,
        'Critical',
        timestamp
      )
    );
  }

  if (reassessmentNeeded) {
    flags.push(
      createFlag(
        'ReassessmentDue',
        `${source} requires reassessment after triage.`,
        selectedPriority === Priority.P1 || selectedPriority === Priority.P2 ? 'Critical' : 'Warning',
        timestamp
      )
    );
  }

  const firstName = identity.firstName?.trim() || 'Unknown';
  const lastName = identity.lastName?.trim() || 'Patient';
  const suggestedPriority = autoSuggestion.suggestedPriority || selectedPriority;
  const override = Boolean(triageSuggestion.override);
  const encounterId = `encounter-${id}`;

  return {
    id,
    mrn,
    firstName,
    lastName,
    dob: identity.dob || '',
    age,
    sex: identity.sex || 'Unspecified',
    arrivalTime: timestamp,
    triageTime: timestamp,
    lastAssessedTime: Object.values(vitals).some((value) => String(value ?? '').trim()) ? timestamp : null,
    chiefComplaint: complaintText.trim() || complaintCategory,
    complaint: complaintText.trim() || complaintCategory,
    complaintCategory,
    state: PatientState.Triage,
    priority: selectedPriority,
    vitals: normalizedVitals,
    assignedStaffId: null,
    roomId: null,
    flags,
    timeline: [
      {
        id: `evt-${id}-arrival`,
        patientId: id,
        type: 'Arrival',
        timestamp,
        summary: `${source} created patient and moved them to ARRIVAL.`,
        metadata: { sessionId, source: 'smart-intake' },
      },
      {
        id: `evt-${id}-encounter`,
        patientId: id,
        type: 'EncounterCreated',
        timestamp,
        summary: `Encounter ${encounterId} created from Smart Intake.`,
        metadata: {
          patientId: id,
          encounterId,
          sessionId,
          arrivalReason: complaintText.trim() || complaintCategory,
          complaintCategory,
          queue: 'Triage',
          intakeSource: 'smart-intake',
        },
      },
      {
        id: `evt-${id}-triage`,
        patientId: id,
        type: 'StateChange',
        from: PatientState.Arrival,
        to: PatientState.Triage,
        timestamp,
        summary: `Patient moved from ARRIVAL to TRIAGE with ${selectedPriority} priority.`,
        metadata: {
          suggestedPriority,
          selectedPriority,
          confidence: autoSuggestion.confidence ?? null,
          ruleTriggered: autoSuggestion.ruleTriggered || null,
          suggestionReason: autoSuggestion.reason || null,
          override,
          reassessmentNeeded,
          verticalSlice: 'smart-intake-arrival-triage',
        },
      },
      ...(override
        ? [
            {
              id: `evt-${id}-triage-override`,
              patientId: id,
              type: 'Triage',
              timestamp,
              summary: `Priority override applied: ${selectedPriority} selected instead of ${suggestedPriority}.`,
              metadata: {
                suggestedPriority,
                selectedPriority,
                ruleTriggered: autoSuggestion.ruleTriggered || null,
                override: true,
              },
            },
          ]
        : []),
    ],
    notes: [],
  };
}
