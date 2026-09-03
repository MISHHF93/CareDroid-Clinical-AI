import type { UnifiedApplicationKnowledgeGraphSnapshot } from '../config/unifiedApplicationKnowledgeGraphModel';
import { buildKnowledgeGraphTimelineItems } from '../services/unifiedApplicationKnowledgeGraphPresentation';
import type {
  Alert,
  JourneyEvent,
  Patient,
  PatientFlag,
  Staff,
  Vitals,
  WorkflowActionLog,
} from '../types/emergency';

export type PatientTimelineCategory =
  | 'intake'
  | 'state-transition'
  | 'triage'
  | 'queue'
  | 'reassessment'
  | 'ems'
  | 'referral'
  | 'boarding'
  | 'discharge'
  | 'ai-copilot'
  | 'provincial-health'
  | 'document';

export type PatientTimelineItem = {
  id: string;
  category: PatientTimelineCategory;
  label: string;
  summary: string;
  timestamp: string;
  source: 'local-patient' | 'emergency-os' | 'patient-management' | 'derived';
  actor?: string;
  severity?: 'Info' | 'Warning' | 'Critical';
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

export type PatientTimelineKnowledgeGraphContext = {
  connectedNodeCount: number;
  alertCount: number;
  recommendationCount: number;
  workflowCount: number;
  departmentIds: string[];
  staffIds: string[];
};

export type PatientTimelineContext = {
  staff?: Staff[];
  alerts?: Alert[];
  journeyEvents?: Array<Record<string, unknown>>;
  emsArrivals?: Array<Record<string, unknown>>;
  queues?: Array<Record<string, unknown>>;
  reassessmentPatients?: Array<Record<string, unknown>>;
  boardingPatients?: Array<Record<string, unknown>>;
  referrals?: Array<Record<string, unknown>>;
  provincialRecords?: Array<Record<string, unknown>>;
  copilotContext?: Record<string, unknown> | null;
  backendTimelineEvents?: Array<Record<string, unknown>>;
  workflowLogs?: WorkflowActionLog[];
  knowledgeGraph?: PatientTimelineKnowledgeGraphContext;
  knowledgeGraphSnapshot?: UnifiedApplicationKnowledgeGraphSnapshot;
  documents?: Array<Record<string, unknown>>;
};

export const PATIENT_TIMELINE_CATEGORY_LABELS: Record<PatientTimelineCategory, string> = {
  intake: 'Intake',
  'state-transition': 'State transition',
  triage: 'Triage',
  queue: 'Queue movement',
  reassessment: 'Reassessment',
  ems: 'EMS',
  referral: 'Referral',
  boarding: 'Boarding',
  discharge: 'Discharge',
  'ai-copilot': 'AI/Copilot',
  'provincial-health': 'Provincial health data',
  document: 'Document processing',
};

const PATIENT_TIMELINE_CATEGORY_ORDER: Record<PatientTimelineCategory, number> = {
  intake: 0,
  triage: 1,
  'state-transition': 2,
  queue: 3,
  reassessment: 4,
  ems: 5,
  referral: 6,
  boarding: 7,
  discharge: 8,
  'ai-copilot': 9,
  'provincial-health': 10,
  document: 11,
};

function timestampOrFallback(value: unknown, fallback: string): string {
  return typeof value === 'string' && value ? value : fallback;
}

function timeValue(value: string): number {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function patientName(patient: Patient): string {
  return `${patient.firstName} ${patient.lastName}`.trim() || patient.mrn || patient.id;
}

function flagValue(flag: PatientFlag | string | { type?: string }): string {
  if (typeof flag === 'string') return flag;
  if (flag && typeof flag === 'object' && 'type' in flag) return String(flag.type || '');
  return String(flag);
}

function hasFlag(patient: Patient, flag: string): boolean {
  return patient.flags.some((item) => flagValue(item) === flag);
}

function staffLabel(staff: Staff[] | undefined, staffId?: string): string | undefined {
  if (!staffId) return undefined;
  return staff?.find((member) => member.id === staffId)?.name || staffId;
}

function latestVitals(patient: Patient): Vitals | undefined {
  return patient.vitals.at(-1);
}

function addItem(items: PatientTimelineItem[], item: PatientTimelineItem) {
  if (!item.timestamp) return;
  items.push(item);
}

function eventPatientId(event: Record<string, unknown>): string {
  return String(event.patientId || event.id || '');
}

function eventMatchesPatient(event: Record<string, unknown>, patient: Patient): boolean {
  const nestedPatient = event.patient;
  if (nestedPatient && typeof nestedPatient === 'object') {
    const nested = nestedPatient as Record<string, unknown>;
    return nested.id === patient.id || nested.mrn === patient.mrn;
  }
  return (
    event.patientId === patient.id ||
    event.mrn === patient.mrn ||
    eventPatientId(event) === patient.id
  );
}

function categoryForJourneyEvent(
  event: JourneyEvent | Record<string, unknown>,
): PatientTimelineCategory {
  const type = String((event as Record<string, unknown>).type || '');
  const to = String(
    (event as Record<string, unknown>).to || (event as Record<string, unknown>).toState || '',
  );
  const note = String(
    (event as Record<string, unknown>).note || (event as Record<string, unknown>).summary || '',
  );
  const text = `${type} ${to} ${note}`.toLowerCase();

  if (to === 'Discharge' || (type === 'DispositionUpdated' && text.includes('discharge')))
    return 'discharge';
  if (type.includes('RoomAssignment') || type.includes('StaffAssignment')) return 'queue';
  if (type.includes('Vitals') || type.includes('Reassessment')) return 'reassessment';
  if (type.includes('EMS') || text.includes('ems') || text.includes('ambulance')) return 'ems';
  if (type.includes('Referral') || text.includes('referral') || text.includes('consult'))
    return 'referral';
  if (to === 'Admission' || text.includes('boarding') || text.includes('pending admission'))
    return 'boarding';
  if (
    type.includes('ClinicalScore') ||
    type === 'SCORE' ||
    type.includes('Protocol') ||
    text.includes('copilot')
  )
    return 'ai-copilot';
  if (to === 'Triage' || type === 'Triage') return 'triage';
  return 'state-transition';
}

function journeySummary(event: JourneyEvent | Record<string, unknown>): string {
  const summary = (event as Record<string, unknown>).summary;
  if (typeof summary === 'string' && summary) return summary;
  const note = (event as Record<string, unknown>).note;
  if (typeof note === 'string' && note) return note;
  const from =
    (event as Record<string, unknown>).from || (event as Record<string, unknown>).fromState;
  const to = (event as Record<string, unknown>).to || (event as Record<string, unknown>).toState;
  if (from && to) return `Moved from ${String(from)} to ${String(to)}.`;
  if (to) return `Moved to ${String(to)}.`;
  return 'Patient journey event recorded.';
}

function mapJourneyEvent(
  event: JourneyEvent | Record<string, unknown>,
  patient: Patient,
  context: PatientTimelineContext,
  source: PatientTimelineItem['source'],
): PatientTimelineItem {
  const category = categoryForJourneyEvent(event);
  const eventRecord = event as Record<string, unknown>;
  return {
    id: String(
      eventRecord.id ||
        `${source}-${patient.id}-${category}-${eventRecord.timestamp || Date.now()}`,
    ),
    category,
    label: PATIENT_TIMELINE_CATEGORY_LABELS[category],
    summary: journeySummary(event),
    timestamp: timestampOrFallback(eventRecord.timestamp, patient.arrivalTime),
    actor: staffLabel(
      context.staff,
      String(eventRecord.staffId || eventRecord.actorStaffId || eventRecord.by || ''),
    ),
    source,
    metadata: {
      type: typeof eventRecord.type === 'string' ? eventRecord.type : undefined,
      from: typeof eventRecord.from === 'string' ? eventRecord.from : undefined,
      to: typeof eventRecord.to === 'string' ? eventRecord.to : undefined,
    },
  };
}

function categoryForWorkflowLog(log: WorkflowActionLog): PatientTimelineCategory {
  if (log.type === 'patient_created') return 'intake';
  if (log.type === 'journey_state_changed') return 'state-transition';
  if (log.type === 'clinician_assigned' || log.type === 'capacity_score_changed') return 'queue';
  if (log.type === 'reassessment_created' || log.type === 'reassessment_completed')
    return 'reassessment';
  if (log.type === 'ems_arrival_created' || log.type === 'ems_converted_to_patient') return 'ems';
  if (log.type === 'referral_created') return 'referral';
  if (log.type === 'boarding_started') return 'boarding';
  if (log.type === 'copilot_used') return 'ai-copilot';
  if (log.type === 'provincial_data_viewed') return 'provincial-health';
  return 'state-transition';
}

function hasCategory(items: PatientTimelineItem[], category: PatientTimelineCategory): boolean {
  return items.some((item) => item.category === category);
}

function alertSeverity(severity: unknown): PatientTimelineItem['severity'] {
  return severity === 'Critical' || severity === 'Warning' || severity === 'Info'
    ? severity
    : 'Info';
}

export function buildPatientTimeline(
  patient: Patient,
  context: PatientTimelineContext = {},
): PatientTimelineItem[] {
  const items: PatientTimelineItem[] = [];
  const name = patientName(patient);
  const latestVital = latestVitals(patient);
  const fallbackTimestamp = patient.arrivalTime || new Date(0).toISOString();
  const triageTimestamp =
    patient.triageTime || patient.timeline.find((event) => event.to === 'Triage')?.timestamp;

  addItem(items, {
    id: `intake-${patient.id}`,
    category: 'intake',
    label: PATIENT_TIMELINE_CATEGORY_LABELS.intake,
    summary: `${name} arrived for ${patient.chiefComplaint || 'emergency care'}.`,
    timestamp: fallbackTimestamp,
    source: 'local-patient',
    metadata: {
      mrn: patient.mrn,
      complaintCategory: patient.complaintCategory,
    },
  });

  if (triageTimestamp || patient.priority) {
    addItem(items, {
      id: `triage-${patient.id}`,
      category: 'triage',
      label: PATIENT_TIMELINE_CATEGORY_LABELS.triage,
      summary: `${patient.priority} triage recorded for ${patient.complaintCategory || patient.chiefComplaint}.`,
      timestamp: triageTimestamp || fallbackTimestamp,
      source: 'derived',
      metadata: {
        priority: patient.priority,
      },
    });
  }

  patient.timeline.forEach((event) =>
    addItem(items, mapJourneyEvent(event, patient, context, 'local-patient')),
  );

  context.backendTimelineEvents
    ?.filter((event) => eventMatchesPatient(event, patient))
    .forEach((event) =>
      addItem(items, mapJourneyEvent(event, patient, context, 'patient-management')),
    );

  context.journeyEvents
    ?.filter((event) => eventMatchesPatient(event, patient))
    .forEach((event) => addItem(items, mapJourneyEvent(event, patient, context, 'emergency-os')));

  context.workflowLogs
    ?.filter((log) => log.patientId === patient.id)
    .forEach((log) => {
      const category = categoryForWorkflowLog(log);
      addItem(items, {
        id: `workflow-${log.id}`,
        category,
        label: PATIENT_TIMELINE_CATEGORY_LABELS[category],
        summary: log.summary,
        timestamp: log.timestamp,
        actor: log.actorName || staffLabel(context.staff, log.actorStaffId),
        severity: log.severity,
        source: 'emergency-os',
        metadata: log.metadata,
      });
    });

  if (!hasCategory(items, 'queue')) {
    const queue = context.queues?.find((candidate) => {
      const patients = Array.isArray(candidate.patients) ? candidate.patients : [];
      return patients.some(
        (row) =>
          row &&
          typeof row === 'object' &&
          eventMatchesPatient(row as Record<string, unknown>, patient),
      );
    });
    addItem(items, {
      id: `queue-${patient.id}`,
      category: 'queue',
      label: PATIENT_TIMELINE_CATEGORY_LABELS.queue,
      summary: patient.roomId
        ? `Patient is in ${patient.roomId} on the ${patient.state} queue.`
        : `Patient is active on the ${String(queue?.label || patient.state)} queue.`,
      timestamp: latestVital?.recordedAt || triageTimestamp || fallbackTimestamp,
      source: queue ? 'emergency-os' : 'derived',
      metadata: {
        queue: String(queue?.label || patient.state),
        roomId: patient.roomId,
      },
    });
  }

  patient.vitals.forEach((vitals, index) => {
    addItem(items, {
      id: `reassessment-vitals-${patient.id}-${index}`,
      category: 'reassessment',
      label: PATIENT_TIMELINE_CATEGORY_LABELS.reassessment,
      summary: `Vitals reassessment recorded: HR ${vitals.hr ?? '--'}, SpO2 ${vitals.spo2 ?? '--'}%.`,
      timestamp: vitals.recordedAt,
      actor: staffLabel(context.staff, vitals.recordedBy),
      source: 'local-patient',
      metadata: {
        hr: vitals.hr,
        spo2: vitals.spo2,
        pain: vitals.pain,
      },
    });
  });

  if (hasFlag(patient, 'ReassessmentDue')) {
    addItem(items, {
      id: `reassessment-flag-${patient.id}`,
      category: 'reassessment',
      label: PATIENT_TIMELINE_CATEGORY_LABELS.reassessment,
      summary: 'Reassessment is due for this patient.',
      timestamp: latestVital?.recordedAt || fallbackTimestamp,
      severity: 'Warning',
      source: 'derived',
    });
  }

  context.alerts
    ?.filter((alert) => alert.patientId === patient.id)
    .forEach((alert) => {
      const text = `${alert.title} ${alert.message}`.toLowerCase();
      const category: PatientTimelineCategory =
        text.includes('ems') || text.includes('stroke pre-arrival')
          ? 'ems'
          : text.includes('reassessment') || text.includes('vitals')
            ? 'reassessment'
            : 'ai-copilot';
      addItem(items, {
        id: `alert-${alert.id}`,
        category,
        label: PATIENT_TIMELINE_CATEGORY_LABELS[category],
        summary: `${alert.title}: ${alert.message}`,
        timestamp: alert.createdAt,
        severity: alertSeverity(alert.severity),
        source: 'local-patient',
      });
    });

  const emsArrival = context.emsArrivals?.find((arrival) => eventMatchesPatient(arrival, patient));
  if (
    emsArrival ||
    hasFlag(patient, 'EMSArrival') ||
    /ems|ambulance|pre-arrival/i.test(patient.chiefComplaint)
  ) {
    addItem(items, {
      id: `ems-${patient.id}`,
      category: 'ems',
      label: PATIENT_TIMELINE_CATEGORY_LABELS.ems,
      summary: String(emsArrival?.handoffStatus || patient.chiefComplaint || 'EMS event recorded.'),
      timestamp: fallbackTimestamp,
      severity: hasFlag(patient, 'HighRisk') ? 'Critical' : 'Info',
      source: emsArrival ? 'emergency-os' : 'derived',
    });
  }

  const referral = context.referrals?.find((candidate) => eventMatchesPatient(candidate, patient));
  if (referral || patient.state === 'Disposition' || hasFlag(patient, 'PendingAdmission')) {
    addItem(items, {
      id: `referral-${patient.id}`,
      category: 'referral',
      label: PATIENT_TIMELINE_CATEGORY_LABELS.referral,
      summary: referral
        ? `${String(referral.specialty || 'Specialty')} referral is ${String(referral.status || 'active')}.`
        : 'Referral or disposition review is active.',
      timestamp: latestVital?.recordedAt || fallbackTimestamp,
      source: referral ? 'emergency-os' : 'derived',
      metadata: {
        specialty: typeof referral?.specialty === 'string' ? referral.specialty : undefined,
        status: typeof referral?.status === 'string' ? referral.status : undefined,
      },
    });
  }

  const boardingPatient = context.boardingPatients?.find((candidate) =>
    eventMatchesPatient(candidate, patient),
  );
  if (boardingPatient || patient.state === 'Admission' || hasFlag(patient, 'PendingAdmission')) {
    addItem(items, {
      id: `boarding-${patient.id}`,
      category: 'boarding',
      label: PATIENT_TIMELINE_CATEGORY_LABELS.boarding,
      summary: 'Boarding or pending admission state is active.',
      timestamp: latestVital?.recordedAt || fallbackTimestamp,
      severity: 'Warning',
      source: boardingPatient ? 'emergency-os' : 'derived',
    });
  }

  if (patient.state === 'Discharge' || patient.timeline.some((event) => event.to === 'Discharge')) {
    addItem(items, {
      id: `discharge-${patient.id}`,
      category: 'discharge',
      label: PATIENT_TIMELINE_CATEGORY_LABELS.discharge,
      summary: 'Discharge event recorded for this encounter.',
      timestamp:
        patient.timeline.find((event) => event.to === 'Discharge')?.timestamp || fallbackTimestamp,
      source: 'derived',
    });
  }

  if (
    hasFlag(patient, 'HighRisk') ||
    hasFlag(patient, 'DeteriorationRisk') ||
    hasFlag(patient, 'SepsisAlert')
  ) {
    addItem(items, {
      id: `ai-copilot-${patient.id}`,
      category: 'ai-copilot',
      label: PATIENT_TIMELINE_CATEGORY_LABELS['ai-copilot'],
      summary:
        'Copilot attention signal includes high-risk, sepsis, or deterioration context for human review.',
      timestamp: latestVital?.recordedAt || fallbackTimestamp,
      severity:
        hasFlag(patient, 'SepsisAlert') || hasFlag(patient, 'DeteriorationRisk')
          ? 'Critical'
          : 'Warning',
      source: context.copilotContext ? 'emergency-os' : 'derived',
    });
  }

  context.documents
    ?.filter((document) => eventMatchesPatient(document, patient))
    .forEach((document) => {
      const status = String(document.status || '');
      const failed = status === 'failed';
      const applied = Boolean(document.appliedToIntake);
      const fieldCount = Array.isArray(document.extractedFields)
        ? document.extractedFields.length
        : 0;
      const documentLabel = String(document.documentType || 'document').replace(/_/g, ' ');
      addItem(items, {
        id: `document-${String(document.id || `${patient.id}-${documentLabel}`)}`,
        category: 'document',
        label: PATIENT_TIMELINE_CATEGORY_LABELS.document,
        summary: failed
          ? `${documentLabel} upload could not be processed; manual entry required.`
          : applied
            ? `${documentLabel} processed and applied to intake (${fieldCount} field${fieldCount === 1 ? '' : 's'}).`
            : `${documentLabel} processed with ${fieldCount} field${fieldCount === 1 ? '' : 's'} awaiting staff review.`,
        timestamp: timestampOrFallback(document.updatedAt || document.createdAt, fallbackTimestamp),
        actor: String(document.reviewer || document.createdBy || '') || undefined,
        severity: failed ? 'Warning' : 'Info',
        source: 'emergency-os',
        metadata: {
          status,
          appliedToIntake: applied,
          fieldCount,
        },
      });
    });

  const provincialRecord = context.provincialRecords?.find((record) =>
    eventMatchesPatient(record, patient),
  );
  addItem(items, {
    id: `provincial-health-${patient.id}`,
    category: 'provincial-health',
    label: PATIENT_TIMELINE_CATEGORY_LABELS['provincial-health'],
    summary: provincialRecord
      ? 'Provincial health connector returned a demo record for medication, allergy, and encounter review.'
      : 'Provincial health lookup is pending or unavailable; continue with local MRN and manual review.',
    timestamp: fallbackTimestamp,
    source: provincialRecord ? 'emergency-os' : 'derived',
    metadata: {
      connectorRecord: Boolean(provincialRecord),
    },
  });

  if (context.knowledgeGraphSnapshot) {
    for (const item of buildKnowledgeGraphTimelineItems(
      patient.id,
      context.knowledgeGraphSnapshot,
    )) {
      addItem(items, item);
    }
  }

  const deduped = new Map<string, PatientTimelineItem>();
  for (const item of items) {
    const key = `${item.id}-${item.category}`;
    if (!deduped.has(key)) deduped.set(key, item);
  }

  return [...deduped.values()].sort((a, b) => {
    const timeDelta = timeValue(b.timestamp) - timeValue(a.timestamp);
    if (timeDelta !== 0) return timeDelta;
    return (
      PATIENT_TIMELINE_CATEGORY_ORDER[a.category] - PATIENT_TIMELINE_CATEGORY_ORDER[b.category]
    );
  });
}
