import { detectHighRiskComplaintFlags } from './highRiskComplaintFlags';
import {
  PatientFlag,
  PatientState,
  type AmbulanceHandoffChecklist,
  type AmbulanceHandoffCriticalFlag,
  type AmbulanceHandoffDestination,
  type AmbulanceHandoffIdentityStatus,
  type EMSArrival,
  type ISODateString,
  type Patient,
  type Room,
  type Vitals,
} from '../types/emergency';

export const AMBULANCE_HANDOFF_DESTINATION_LABELS: Record<AmbulanceHandoffDestination, string> = {
  pending: 'Pending',
  waiting: 'Waiting room',
  room: 'Treatment / resus room',
  'monitored-chair': 'Monitored chair',
  hallway: 'Hallway',
  'offload-area': 'Offload area',
};

export const AMBULANCE_HANDOFF_IDENTITY_LABELS: Record<AmbulanceHandoffIdentityStatus, string> = {
  unknown: 'Unknown / not verified',
  provisional: 'Provisional identity',
  verified: 'Identity verified',
  mismatch: 'Identity mismatch flagged',
};

export type AmbulanceHandoffChecklistFieldId =
  | 'identity-status'
  | 'complaint-summary'
  | 'vitals-received'
  | 'medications-en-route'
  | 'critical-flags'
  | 'handoff-accepted'
  | 'patient-destination';

export type AmbulanceHandoffChecklistFieldKind =
  | 'select'
  | 'text'
  | 'boolean'
  | 'list'
  | 'flags'
  | 'derived';

export type AmbulanceHandoffChecklistFieldDefinition = {
  id: AmbulanceHandoffChecklistFieldId;
  label: string;
  kind: AmbulanceHandoffChecklistFieldKind;
  staffEditable: boolean;
  requiredForComplete: boolean;
};

/** Canonical structured checklist fields — single source for UI and completion logic. */
export const AMBULANCE_HANDOFF_CHECKLIST_FIELDS: readonly AmbulanceHandoffChecklistFieldDefinition[] =
  Object.freeze([
    {
      id: 'identity-status',
      label: 'Patient identity status',
      kind: 'select',
      staffEditable: true,
      requiredForComplete: true,
    },
    {
      id: 'complaint-summary',
      label: 'Complaint summary',
      kind: 'derived',
      staffEditable: true,
      requiredForComplete: true,
    },
    {
      id: 'vitals-received',
      label: 'Vitals received',
      kind: 'boolean',
      staffEditable: true,
      requiredForComplete: true,
    },
    {
      id: 'medications-en-route',
      label: 'Medications given en route',
      kind: 'list',
      staffEditable: true,
      requiredForComplete: false,
    },
    {
      id: 'critical-flags',
      label: 'Critical flags',
      kind: 'flags',
      staffEditable: false,
      requiredForComplete: false,
    },
    {
      id: 'handoff-accepted',
      label: 'Handoff accepted',
      kind: 'boolean',
      staffEditable: true,
      requiredForComplete: true,
    },
    {
      id: 'patient-destination',
      label: 'Patient moved to',
      kind: 'select',
      staffEditable: true,
      requiredForComplete: true,
    },
  ]);

export type AmbulanceHandoffChecklistStepStatus = 'complete' | 'pending' | 'warning';

export type AmbulanceHandoffChecklistStep = {
  id: AmbulanceHandoffChecklistFieldId;
  label: string;
  status: AmbulanceHandoffChecklistStepStatus;
  value: string;
  required: boolean;
};

export const AMBULANCE_HANDOFF_CHECKLIST_SURFACES = Object.freeze([
  'ems-pipeline',
  'reception-ems',
  'whiteboard',
  'ems-offload-tracker',
  'patient-chart',
]);

type RoomLike = Pick<Room, 'id' | 'name' | 'type'>;

const MEDICATION_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\baspirin\b/i, label: 'Aspirin' },
  { pattern: /\bnitro(glycerin|glycerine)?\b/i, label: 'Nitroglycerin' },
  { pattern: /\bepinephrine\b|\bepi pen\b|\bepipen\b/i, label: 'Epinephrine' },
  { pattern: /\balbuterol\b|\bsalbutamol\b|\bneb(ulizer)?\b/i, label: 'Albuterol / nebulizer' },
  { pattern: /\bd50\b|\bdextrose\b|\bglucose\b/i, label: 'Dextrose / glucose' },
  { pattern: /\bnaloxone\b|\bnarcan\b/i, label: 'Naloxone' },
  { pattern: /\bdiphenhydramine\b|\bbenadryl\b/i, label: 'Diphenhydramine' },
  { pattern: /\bondansetron\b|\bzofran\b/i, label: 'Ondansetron' },
  { pattern: /\bfentanyl\b/i, label: 'Fentanyl' },
  { pattern: /\bmorphine\b/i, label: 'Morphine' },
  { pattern: /\bketamine\b/i, label: 'Ketamine' },
  { pattern: /\bheparin\b/i, label: 'Heparin' },
  { pattern: /\btxa\b|\btranexamic\b/i, label: 'Tranexamic acid' },
  { pattern: /\biv fluid(s)?\b|\bnormal saline\b|\blactated ringer/i, label: 'IV fluids' },
  { pattern: /\boxygen\b|\bo2\b/i, label: 'Supplemental oxygen' },
];

const STAFF_OVERRIDE_KEYS = [
  'identityStatus',
  'medicationsEnRoute',
  'handoffAccepted',
  'handoffAcceptedAt',
  'handoffAcceptedByStaffId',
  'handoffAcceptedByStaffName',
  'patientDestination',
  'destinationLabel',
  'destinationRoomId',
  'handoffNotes',
] as const satisfies readonly (keyof AmbulanceHandoffChecklist)[];

function nowIso(): ISODateString {
  return new Date().toISOString();
}

function hasVitals(vitals?: Vitals | null): boolean {
  if (!vitals) return false;
  return Object.values(vitals).some(
    (value) => value !== undefined && value !== null && value !== '',
  );
}

function isEmsPlaceholderPatient(patient?: Patient | null): boolean {
  if (!patient) return true;
  if (patient.firstName === 'EMS' && /^Patient\b/i.test(patient.lastName || '')) return true;
  return false;
}

export function parseMedicationsEnRoute(...sources: (string | string[] | undefined | null)[]): string[] {
  const explicit = sources.flatMap((source) =>
    Array.isArray(source) ? source : [],
  );
  const text = sources
    .filter((source): source is string => typeof source === 'string')
    .join(' ');
  const found = new Set(
    explicit.map((entry) => entry.trim()).filter(Boolean),
  );

  for (const { pattern, label } of MEDICATION_PATTERNS) {
    if (pattern.test(text)) found.add(label);
  }

  const administered = text.match(
    /\b(?:gave|administered|given|received)\s+([a-z0-9 /+-]{2,40})/gi,
  );
  administered?.forEach((match) => {
    const value = match.replace(/^(gave|administered|given|received)\s+/i, '').trim();
    if (value.length >= 2 && value.length <= 40) found.add(value);
  });

  return [...found];
}

export function deriveAmbulanceHandoffIdentityStatus(
  arrival: EMSArrival,
  patient?: Patient | null,
): AmbulanceHandoffIdentityStatus {
  if (patient?.flags?.includes(PatientFlag.IdentityPending)) return 'provisional';
  if (patient?.registrationStatus === 'provisional' || patient?.registrationStatus === 'pending') {
    return 'provisional';
  }
  if (patient?.registrationStatus === 'complete' && !isEmsPlaceholderPatient(patient)) {
    return 'verified';
  }
  if (arrival.patientId && !isEmsPlaceholderPatient(patient)) return 'verified';
  if (isEmsPlaceholderPatient(patient)) return 'unknown';
  return 'unknown';
}

function roomById(rooms: RoomLike[], roomId?: string | null): RoomLike | undefined {
  if (!roomId) return undefined;
  return rooms.find((room) => room.id === roomId);
}

function locationHintDestination(location?: string | null): AmbulanceHandoffDestination | null {
  if (!location) return null;
  const normalized = location.toLowerCase();
  if (/\bchair\b|\bfast track chair\b/.test(normalized)) return 'monitored-chair';
  if (/\bhall(way)?\b|\bcorridor\b/.test(normalized)) return 'hallway';
  if (/\boffload\b|\bbay\b|\bems\b/.test(normalized)) return 'offload-area';
  if (/\bwaiting\b|\blobby\b|\breception\b/.test(normalized)) return 'waiting';
  return null;
}

export function deriveAmbulanceHandoffDestination(
  arrival: EMSArrival,
  patient?: Patient | null,
  rooms: RoomLike[] = [],
): Pick<AmbulanceHandoffChecklist, 'patientDestination' | 'destinationLabel' | 'destinationRoomId'> {
  const roomId = patient?.roomId || arrival.preparedRoomId;
  const room = roomById(rooms, roomId);
  const locationHint = locationHintDestination(patient?.location);

  if (room) {
    return {
      patientDestination: 'room',
      destinationLabel: room.name,
      destinationRoomId: room.id,
    };
  }

  if (locationHint) {
    return {
      patientDestination: locationHint,
      destinationLabel: patient?.location || AMBULANCE_HANDOFF_DESTINATION_LABELS[locationHint],
    };
  }

  if (patient?.state === PatientState.Waiting) {
    return {
      patientDestination: 'waiting',
      destinationLabel: AMBULANCE_HANDOFF_DESTINATION_LABELS.waiting,
    };
  }

  if (arrival.preparedRoomId && !patient?.roomId) {
    const prepared = roomById(rooms, arrival.preparedRoomId);
    return {
      patientDestination: 'offload-area',
      destinationLabel: prepared?.name || 'Prepared bay',
      destinationRoomId: arrival.preparedRoomId,
    };
  }

  if (['Handoff', 'Complete'].includes(arrival.status) && arrival.patientId) {
    return {
      patientDestination: 'offload-area',
      destinationLabel: AMBULANCE_HANDOFF_DESTINATION_LABELS['offload-area'],
    };
  }

  return {
    patientDestination: 'pending',
    destinationLabel: AMBULANCE_HANDOFF_DESTINATION_LABELS.pending,
  };
}

export function deriveAmbulanceHandoffCriticalFlags(
  arrival: EMSArrival,
  patient?: Patient | null,
): AmbulanceHandoffCriticalFlag[] {
  const flags: AmbulanceHandoffCriticalFlag[] = [];
  const seen = new Set<string>();

  const push = (flag: AmbulanceHandoffCriticalFlag) => {
    if (seen.has(flag.id)) return;
    seen.add(flag.id);
    flags.push(flag);
  };

  if (arrival.severity === 'Critical') {
    push({ id: 'ems-critical', label: 'EMS critical severity', source: 'ems-severity' });
  } else if (arrival.severity === 'High') {
    push({ id: 'ems-high', label: 'EMS high severity', source: 'ems-severity' });
  }

  if (arrival.criticalChecklist?.type) {
    push({
      id: `critical-checklist-${arrival.criticalChecklist.type}`,
      label: arrival.criticalChecklist.title,
      source: 'critical-checklist',
    });
  }

  const complaintText =
    arrival.chiefComplaint || arrival.prearrivalComplaint || patient?.chiefComplaint || '';
  detectHighRiskComplaintFlags({
    complaint: complaintText,
    complaintCategory: patient?.complaintCategory,
  }).forEach((flag) => {
    push({
      id: `hr-${flag.id}`,
      label: flag.label,
      source: 'high-risk-complaint',
    });
  });

  const patientFlags = patient?.flags || [];
  if (patientFlags.includes(PatientFlag.HighRisk)) {
    push({ id: 'patient-high-risk', label: 'High risk', source: 'patient-flag' });
  }
  if (patientFlags.includes(PatientFlag.StrokeCode)) {
    push({ id: 'patient-stroke', label: 'Stroke code', source: 'patient-flag' });
  }
  if (patientFlags.includes(PatientFlag.SepsisAlert)) {
    push({ id: 'patient-sepsis', label: 'Sepsis alert', source: 'patient-flag' });
  }
  if (patientFlags.includes(PatientFlag.PsychAlert)) {
    push({ id: 'patient-psych', label: 'Psychiatric alert', source: 'patient-flag' });
  }
  if (patientFlags.includes(PatientFlag.Isolation)) {
    push({ id: 'patient-isolation', label: 'Isolation', source: 'patient-flag' });
  }

  patient?.highRiskComplaintFlags?.forEach((flag) => {
    push({
      id: `hr-stored-${flag.id}`,
      label: flag.label,
      source: 'high-risk-complaint',
    });
  });

  return flags;
}

export function buildAmbulanceHandoffChecklist(
  arrival: EMSArrival,
  options: {
    patient?: Patient | null;
    rooms?: RoomLike[];
    timestamp?: ISODateString;
  } = {},
): AmbulanceHandoffChecklist {
  const timestamp = options.timestamp || nowIso();
  const patient = options.patient ?? null;
  const vitalsSnapshot = arrival.vitals || patient?.currentVitals || patient?.vitals?.[0];
  const destination = deriveAmbulanceHandoffDestination(arrival, patient, options.rooms || []);
  const medicationsEnRoute = parseMedicationsEnRoute(
    arrival.medicationsEnRoute,
    arrival.handoffSummary,
    arrival.notes,
    patient?.notes?.map((note) => note.body).join(' '),
  );

  return {
    arrivalId: arrival.id,
    patientId: arrival.patientId || patient?.id,
    identityStatus: deriveAmbulanceHandoffIdentityStatus(arrival, patient),
    complaintSummary:
      arrival.chiefComplaint ||
      arrival.prearrivalComplaint ||
      patient?.chiefComplaint ||
      'Complaint pending',
    vitalsReceived: hasVitals(vitalsSnapshot),
    vitalsSnapshot: vitalsSnapshot || undefined,
    medicationsEnRoute,
    criticalFlags: deriveAmbulanceHandoffCriticalFlags(arrival, patient),
    handoffSummary: arrival.handoffSummary || arrival.notes || undefined,
    handoffAccepted: Boolean(arrival.handoffCompletedAt),
    handoffAcceptedAt: arrival.handoffCompletedAt,
    patientDestination: destination.patientDestination,
    destinationLabel: destination.destinationLabel,
    destinationRoomId: destination.destinationRoomId,
    updatedAt: timestamp,
  };
}

function pickStaffOverrides(
  stored?: AmbulanceHandoffChecklist | null,
): Partial<AmbulanceHandoffChecklist> {
  if (!stored) return {};
  const patch: Partial<AmbulanceHandoffChecklist> = {};
  for (const key of STAFF_OVERRIDE_KEYS) {
    const value = stored[key];
    if (value !== undefined && value !== null) {
      (patch as Record<string, unknown>)[key] = value;
    }
  }
  if (stored.medicationsEnRoute?.length) {
    patch.medicationsEnRoute = stored.medicationsEnRoute;
  }
  return patch;
}

export function resolveAmbulanceHandoffChecklist(
  arrival: EMSArrival,
  options: {
    patient?: Patient | null;
    rooms?: RoomLike[];
    timestamp?: ISODateString;
  } = {},
): AmbulanceHandoffChecklist {
  const derived = buildAmbulanceHandoffChecklist(arrival, options);
  const stored = arrival.ambulanceHandoffChecklist;
  if (!stored) return derived;

  const mergedMedications = [
    ...new Set([...(derived.medicationsEnRoute || []), ...(stored.medicationsEnRoute || [])]),
  ];

  return {
    ...derived,
    ...pickStaffOverrides(stored),
    medicationsEnRoute: mergedMedications,
    criticalFlags: [
      ...derived.criticalFlags,
      ...stored.criticalFlags.filter(
        (flag) => flag.source === 'staff' && !derived.criticalFlags.some((entry) => entry.id === flag.id),
      ),
    ],
    updatedAt: stored.updatedAt || derived.updatedAt,
  };
}

export function mergeAmbulanceHandoffChecklistPatch(
  current: AmbulanceHandoffChecklist,
  patch: Partial<AmbulanceHandoffChecklist>,
  actor?: { staffId?: string; staffName?: string },
): AmbulanceHandoffChecklist {
  const timestamp = nowIso();
  const next: AmbulanceHandoffChecklist = {
    ...current,
    ...patch,
    medicationsEnRoute: patch.medicationsEnRoute?.length
      ? [...new Set(patch.medicationsEnRoute.map((entry) => entry.trim()).filter(Boolean))]
      : current.medicationsEnRoute,
    updatedAt: timestamp,
  };

  if (patch.handoffAccepted === true && !current.handoffAccepted) {
    next.handoffAcceptedAt = patch.handoffAcceptedAt || timestamp;
    next.handoffAcceptedByStaffId = patch.handoffAcceptedByStaffId || actor?.staffId;
    next.handoffAcceptedByStaffName = patch.handoffAcceptedByStaffName || actor?.staffName;
  }

  if (patch.handoffAccepted === false) {
    next.handoffAcceptedAt = undefined;
    next.handoffAcceptedByStaffId = undefined;
    next.handoffAcceptedByStaffName = undefined;
  }

  if (patch.patientDestination && patch.patientDestination !== current.patientDestination) {
    next.destinationLabel =
      patch.destinationLabel || AMBULANCE_HANDOFF_DESTINATION_LABELS[patch.patientDestination];
  }

  return next;
}

export function formatAmbulanceHandoffDestination(
  checklist: Pick<AmbulanceHandoffChecklist, 'patientDestination' | 'destinationLabel'>,
): string {
  if (checklist.destinationLabel?.trim()) return checklist.destinationLabel.trim();
  return AMBULANCE_HANDOFF_DESTINATION_LABELS[checklist.patientDestination];
}

export function ambulanceHandoffChecklistCompletionPercent(
  checklist: AmbulanceHandoffChecklist,
): number {
  const steps = buildAmbulanceHandoffChecklistSteps(checklist);
  const required = steps.filter((step) => step.required);
  if (!required.length) return 0;
  const complete = required.filter((step) => step.status === 'complete').length;
  return Math.round((complete / required.length) * 100);
}

function identityStepStatus(status: AmbulanceHandoffIdentityStatus): AmbulanceHandoffChecklistStepStatus {
  if (status === 'verified' || status === 'provisional') return 'complete';
  if (status === 'mismatch') return 'warning';
  return 'pending';
}

/** Structured step list for panels, badges, and operational summaries. */
export function buildAmbulanceHandoffChecklistSteps(
  checklist: AmbulanceHandoffChecklist,
): AmbulanceHandoffChecklistStep[] {
  return AMBULANCE_HANDOFF_CHECKLIST_FIELDS.map((field) => {
    switch (field.id) {
      case 'identity-status':
        return {
          id: field.id,
          label: field.label,
          status: identityStepStatus(checklist.identityStatus),
          value: AMBULANCE_HANDOFF_IDENTITY_LABELS[checklist.identityStatus],
          required: field.requiredForComplete,
        };
      case 'complaint-summary':
        return {
          id: field.id,
          label: field.label,
          status: checklist.complaintSummary?.trim() ? 'complete' : 'pending',
          value: checklist.complaintSummary || 'Pending',
          required: field.requiredForComplete,
        };
      case 'vitals-received':
        return {
          id: field.id,
          label: field.label,
          status: checklist.vitalsReceived ? 'complete' : 'pending',
          value: checklist.vitalsReceived ? 'Received' : 'Pending',
          required: field.requiredForComplete,
        };
      case 'medications-en-route':
        return {
          id: field.id,
          label: field.label,
          status: checklist.medicationsEnRoute.length ? 'complete' : 'pending',
          value: checklist.medicationsEnRoute.length
            ? checklist.medicationsEnRoute.join(', ')
            : 'None documented',
          required: field.requiredForComplete,
        };
      case 'critical-flags':
        return {
          id: field.id,
          label: field.label,
          status: checklist.criticalFlags.length ? 'warning' : 'complete',
          value: checklist.criticalFlags.length
            ? checklist.criticalFlags.map((flag) => flag.label).join(', ')
            : 'None',
          required: field.requiredForComplete,
        };
      case 'handoff-accepted':
        return {
          id: field.id,
          label: field.label,
          status: checklist.handoffAccepted ? 'complete' : 'pending',
          value: checklist.handoffAccepted
            ? checklist.handoffAcceptedByStaffName
              ? `Accepted by ${checklist.handoffAcceptedByStaffName}`
              : 'Accepted'
            : 'Awaiting acceptance',
          required: field.requiredForComplete,
        };
      case 'patient-destination':
        return {
          id: field.id,
          label: field.label,
          status: checklist.patientDestination !== 'pending' ? 'complete' : 'pending',
          value: formatAmbulanceHandoffDestination(checklist),
          required: field.requiredForComplete,
        };
      default:
        return {
          id: field.id,
          label: field.label,
          status: 'pending',
          value: '—',
          required: field.requiredForComplete,
        };
    }
  });
}

/** Applies operational patient location/state from confirmed handoff destination. */
export function buildPatientPatchFromHandoffChecklist(
  checklist: AmbulanceHandoffChecklist,
): Partial<Patient> {
  const patch: Partial<Patient> = {};

  if (checklist.destinationLabel?.trim()) {
    patch.location = checklist.destinationLabel.trim();
  }

  if (checklist.destinationRoomId) {
    patch.roomId = checklist.destinationRoomId;
  }

  switch (checklist.patientDestination) {
    case 'waiting':
      patch.state = PatientState.Waiting;
      break;
    case 'room':
      if (checklist.destinationRoomId) patch.state = PatientState.Assessment;
      break;
    case 'monitored-chair':
    case 'hallway':
    case 'offload-area':
      patch.state = PatientState.Waiting;
      break;
    default:
      break;
  }

  return patch;
}

export type AmbulanceHandoffChecklistStore = {
  emsArrivals: EMSArrival[];
  dispatchWebSocketEvent?: (event: {
    type: string;
    payload: Record<string, unknown>;
  }) => void;
};

export function syncAmbulanceHandoffChecklistSurfaces(
  store: AmbulanceHandoffChecklistStore,
  arrivalId: string,
  checklist: AmbulanceHandoffChecklist,
  options: { source?: string } = {},
): void {
  store.dispatchWebSocketEvent?.({
    type: 'ambulance_handoff_checklist_sync',
    payload: {
      arrivalId,
      patientId: checklist.patientId || null,
      source: options.source || 'ambulance-handoff-checklist',
      surfaces: [...AMBULANCE_HANDOFF_CHECKLIST_SURFACES],
      completionPercent: ambulanceHandoffChecklistCompletionPercent(checklist),
      steps: buildAmbulanceHandoffChecklistSteps(checklist).map((step) => ({
        id: step.id,
        label: step.label,
        status: step.status,
        value: step.value,
        required: step.required,
      })),
      checklist: {
        identityStatus: checklist.identityStatus,
        complaintSummary: checklist.complaintSummary,
        vitalsReceived: checklist.vitalsReceived,
        medicationsEnRoute: checklist.medicationsEnRoute,
        criticalFlags: checklist.criticalFlags,
        handoffAccepted: checklist.handoffAccepted,
        patientDestination: checklist.patientDestination,
        destinationLabel: checklist.destinationLabel,
      },
      generatedAt: new Date().toISOString(),
    },
  });
}

export function normalizeAmbulanceHandoffChecklist(
  raw: unknown,
  arrivalId: string,
): AmbulanceHandoffChecklist | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Partial<AmbulanceHandoffChecklist>;
  if (!record.arrivalId && !arrivalId) return null;

  const patientDestination = record.patientDestination || 'pending';
  return {
    arrivalId: record.arrivalId || arrivalId,
    patientId: record.patientId,
    identityStatus: record.identityStatus || 'unknown',
    complaintSummary: record.complaintSummary || 'Complaint pending',
    vitalsReceived: Boolean(record.vitalsReceived),
    vitalsSnapshot: record.vitalsSnapshot,
    medicationsEnRoute: Array.isArray(record.medicationsEnRoute) ? record.medicationsEnRoute : [],
    criticalFlags: Array.isArray(record.criticalFlags) ? record.criticalFlags : [],
    handoffSummary: record.handoffSummary,
    handoffAccepted: Boolean(record.handoffAccepted),
    handoffAcceptedAt: record.handoffAcceptedAt,
    handoffAcceptedByStaffId: record.handoffAcceptedByStaffId,
    handoffAcceptedByStaffName: record.handoffAcceptedByStaffName,
    patientDestination,
    destinationLabel:
      record.destinationLabel || AMBULANCE_HANDOFF_DESTINATION_LABELS[patientDestination],
    destinationRoomId: record.destinationRoomId,
    handoffNotes: record.handoffNotes,
    updatedAt: record.updatedAt || nowIso(),
  };
}
