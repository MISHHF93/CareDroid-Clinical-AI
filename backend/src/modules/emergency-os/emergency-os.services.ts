import { Injectable } from '@nestjs/common';
import {
  emergencyAlertsFixture,
  emergencyPatientsFixture,
  emergencyRoomsFixture,
  emergencyStaffFixture,
} from './emergency-os.fixtures';
import type {
  CapacitySnapshot,
  EmergencyAlert,
  EmergencyEncounter,
  EmergencyModuleEnvelope,
  EmergencyOsSettingsContract,
  EmergencyOsSettingsPatch,
  EmergencyPatient,
  EmergencyPatientState,
  EmergencyRoom,
  EmergencyStaff,
  EmergencyVitals,
  WorkflowActionLog,
  WorkflowActionType,
} from './emergency-os.types';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function minutesSince(timestamp: string): number {
  const ms = new Date(timestamp).getTime();
  if (!Number.isFinite(ms)) return 0;
  return Math.max(0, Math.round((Date.now() - ms) / 60000));
}

function isHighRisk(patient: EmergencyPatient): boolean {
  return (
    patient.priority === 'P1' ||
    patient.priority === 'P2' ||
    patient.flags.some((flag) => ['HighRisk', 'DeteriorationRisk', 'SepsisAlert'].includes(flag))
  );
}

function isBoarding(patient: EmergencyPatient): boolean {
  return (
    patient.state === 'Admission' ||
    patient.state === 'Disposition' ||
    patient.flags.includes('PendingAdmission')
  );
}

function latestVitals(patient: EmergencyPatient): Partial<EmergencyVitals> {
  if (Array.isArray(patient.vitals)) return patient.vitals.at(-1) || {};
  return (patient.vitals || {}) as Partial<EmergencyVitals>;
}

function numericVital(vitals: Partial<EmergencyVitals>, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = (vitals as Record<string, unknown>)[key];
    const parsed = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function requiresReassessment(patient: EmergencyPatient): boolean {
  const vitals = latestVitals(patient);
  const hr = numericVital(vitals, 'hr', 'heartRate');
  const sbp = numericVital(vitals, 'sbp', 'bpSystolic', 'bloodPressure');
  const spo2 = numericVital(vitals, 'spo2', 'oxygenSaturation');
  const temp = numericVital(vitals, 'temp', 'temperature');
  const pain = numericVital(vitals, 'pain', 'painScore');

  return (
    patient.priority === 'P1' ||
    patient.priority === 'P2' ||
    (hr !== null && (hr < 50 || hr > 120)) ||
    (sbp !== null && sbp < 90) ||
    (spo2 !== null && spo2 < 94) ||
    (temp !== null && temp > 38.5) ||
    (pain !== null && pain >= 8)
  );
}

function withUniqueFlags(flags: string[]): string[] {
  return Array.from(new Set(flags.filter(Boolean)));
}

function envelope<T>(
  module: string,
  data: T,
  remainingGaps: string[] = [],
): EmergencyModuleEnvelope<T> {
  return {
    module,
    generatedAt: new Date().toISOString(),
    source: 'backend-fixture',
    status: remainingGaps.length ? 'placeholder' : 'active',
    data,
    remainingGaps,
  };
}

function mergeSettings<T>(current: T, patch: unknown): T {
  const currentRecord = current as Record<string, unknown>;
  const patchRecord = (patch || {}) as Record<string, unknown>;
  const next: Record<string, unknown> = { ...currentRecord };
  for (const [key, value] of Object.entries(patchRecord)) {
    if (value === undefined) continue;
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      currentRecord[key] &&
      typeof currentRecord[key] === 'object' &&
      !Array.isArray(currentRecord[key])
    ) {
      next[key] = mergeSettings(
        currentRecord[key] as Record<string, unknown>,
        value as Record<string, unknown>,
      );
      continue;
    }
    next[key] = value;
  }
  return next as T;
}

const DEFAULT_EMERGENCY_OS_SETTINGS: EmergencyOsSettingsContract = {
  tenantName: 'CareDroid Emergency Department',
  defaultWorkspace: 'emergency-whiteboard',
  enabledModules: [
    { id: 'whiteboard', label: 'Emergency Whiteboard', enabled: true },
    { id: 'patients', label: 'Patients', enabled: true },
    { id: 'journey', label: 'Patient Journey Engine', enabled: true },
    { id: 'ems', label: 'EMS Intake', enabled: true },
    { id: 'smartIntake', label: 'Smart Intake', enabled: true },
    { id: 'queues', label: 'Queue Intelligence', enabled: true },
    { id: 'reassessment', label: 'Reassessment Engine', enabled: true },
    { id: 'capacity', label: 'Capacity Intelligence', enabled: true },
    { id: 'boarding', label: 'Boarding Intelligence', enabled: true },
    { id: 'referrals', label: 'Referral Intelligence', enabled: true },
    { id: 'provincialHealth', label: 'Provincial Health Connector', enabled: false },
    { id: 'integrations', label: 'IoT/Integration Hub', enabled: true },
    { id: 'copilot', label: 'ED Copilot', enabled: true },
    { id: 'analytics', label: 'Analytics', enabled: true },
    { id: 'settings', label: 'Settings', enabled: true },
  ],
  aiSettings: {
    enabled: true,
    provider: 'CareDroid demo router',
    model: 'clinical-command-preview',
    triageAssistEnabled: true,
    summarizationEnabled: true,
    humanReviewRequired: true,
  },
  integrationSettings: {
    ehrEnabled: false,
    fhirEndpoint: 'https://fhir.demo.local/R4',
    hl7InterfaceId: 'hl7-demo',
    deviceTelemetryEnabled: false,
  },
  provincialHealthSettings: {
    connectorEnabled: false,
    jurisdiction: 'Ontario',
    lookupMode: 'manual-review',
    healthCardValidation: true,
  },
  notificationSettings: {
    inAppEnabled: true,
    emailEnabled: false,
    smsEnabled: false,
    escalationMinutes: 10,
    quietHoursStart: '22:00',
    quietHoursEnd: '06:00',
  },
  reassessmentThresholds: {
    P1: 15,
    P2: 30,
    P3: 60,
    P4: 120,
    P5: 180,
    overdueGraceMinutes: 10,
  },
  capacityThresholds: {
    departmentCapacityTarget: 30,
    warningPercent: 80,
    criticalPercent: 90,
    maxWaitingPatients: 12,
  },
  emsThresholds: {
    offloadTargetMinutes: 15,
    criticalEtaMinutes: 8,
    autoCreateArrival: true,
  },
  boardingThresholds: {
    escalationMinutes: 180,
    criticalMinutes: 240,
    maxBoarders: 6,
    inpatientNotifyMinutes: 120,
  },
  thresholds: {
    waitWarningMinutes: 45,
    waitCriticalMinutes: 60,
    capacityWarningPercent: 80,
    emsOffloadTargetMinutes: 15,
    reassessmentIntervals: {
      P1: 15,
      P2: 30,
      P3: 60,
      P4: 120,
      P5: 180,
    },
  },
  departmentCapacityTarget: 30,
  alertRules: {
    Reassessment: { enabled: true, severity: 'Warning' },
    Capacity: { enabled: true, severity: 'Warning' },
    EMS: { enabled: true, severity: 'Warning' },
    Boarding: { enabled: true, severity: 'Warning' },
    Queue: { enabled: true, severity: 'Warning' },
    System: { enabled: true, severity: 'Info' },
    CAPACITY_CRISIS: { enabled: true, severity: 'Critical' },
  },
  updatedAt: new Date(0).toISOString(),
};

const WORKFLOW_LOG_TITLES: Record<WorkflowActionType, string> = {
  patient_created: 'Patient created',
  journey_state_changed: 'Journey state changed',
  clinician_assigned: 'Clinician assigned',
  reassessment_created: 'Reassessment created',
  reassessment_completed: 'Reassessment completed',
  ems_arrival_created: 'EMS arrival created',
  ems_converted_to_patient: 'EMS converted to patient',
  capacity_score_changed: 'Capacity score changed',
  boarding_started: 'Boarding started',
  referral_created: 'Referral created',
  copilot_used: 'Copilot used',
  provincial_data_viewed: 'Provincial data viewed',
  integration_event_received: 'Integration event received',
};

type WorkflowActionInput = Omit<
  WorkflowActionLog,
  'id' | 'timestamp' | 'title' | 'severity' | 'status' | 'source' | 'metadata'
> &
  Partial<
    Pick<
      WorkflowActionLog,
      'id' | 'timestamp' | 'title' | 'severity' | 'status' | 'source' | 'metadata'
    >
  >;

@Injectable()
export class WorkflowActionLogService {
  private readonly logs: WorkflowActionLog[] = [];

  record(input: WorkflowActionInput): WorkflowActionLog {
    const timestamp = input.timestamp || new Date().toISOString();
    const log: WorkflowActionLog = {
      id: input.id || createId(`workflow-${input.type}`),
      type: input.type,
      title: input.title || WORKFLOW_LOG_TITLES[input.type],
      summary: input.summary,
      timestamp,
      actorStaffId: input.actorStaffId,
      actorName: input.actorName,
      patientId: input.patientId,
      source: input.source || 'emergency-os-backend',
      severity: input.severity || 'Info',
      status: input.status || 'recorded',
      metadata: input.metadata || {},
    };
    this.logs.unshift(log);
    return clone(log);
  }

  listLogs(patientId?: string): WorkflowActionLog[] {
    return clone(
      this.logs
        .filter((log) => !patientId || log.patientId === patientId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    );
  }

  getEnvelope(patientId?: string): EmergencyModuleEnvelope<{ logs: WorkflowActionLog[] }> {
    return envelope('Workflow Action Audit', {
      logs: this.listLogs(patientId),
    });
  }
}

@Injectable()
export class EmergencyPatientService {
  private readonly patients: EmergencyPatient[] = clone(emergencyPatientsFixture);
  private readonly rooms: EmergencyRoom[] = clone(emergencyRoomsFixture);
  private readonly staff: EmergencyStaff[] = clone(emergencyStaffFixture);
  private readonly alerts: EmergencyAlert[] = clone(emergencyAlertsFixture);
  private lastCapacityScore: number | undefined;

  constructor(private readonly workflowLogService: WorkflowActionLogService) {}

  listPatients(): EmergencyPatient[] {
    return clone(this.patients);
  }

  listRooms(): EmergencyRoom[] {
    return clone(this.rooms);
  }

  listStaff(): EmergencyStaff[] {
    return clone(this.staff);
  }

  listAlerts(): EmergencyAlert[] {
    return clone(this.alerts);
  }

  createPatient(input: Partial<EmergencyPatient>): EmergencyPatient {
    const now = new Date().toISOString();
    const state = input.state || 'Triage';
    const priority = input.priority || 'P3';
    const patient: EmergencyPatient = {
      id: input.id || createId('patient'),
      mrn: input.mrn || `ED-${Math.floor(100000 + Math.random() * 900000)}`,
      firstName: input.firstName || 'Unknown',
      lastName: input.lastName || 'Patient',
      dob: input.dob || now.slice(0, 10),
      age: Number.isFinite(input.age) ? Number(input.age) : 0,
      sex: input.sex || 'Other',
      arrivalTime: input.arrivalTime || now,
      triageTime: input.triageTime ?? (state === 'Triage' ? now : undefined),
      chiefComplaint: input.chiefComplaint || 'Unspecified complaint',
      complaintCategory: input.complaintCategory || 'Other',
      state,
      priority,
      vitals: (Array.isArray(input.vitals)
        ? input.vitals
        : input.vitals
          ? [input.vitals as unknown as EmergencyVitals]
          : []) as EmergencyVitals[],
      flags: input.flags || (priority === 'P1' || priority === 'P2' ? ['HighRisk'] : []),
      assignedStaffId: input.assignedStaffId,
      roomId: input.roomId,
      notes: input.notes || [],
      timeline: input.timeline || [
        {
          id: createId('journey'),
          to: input.state || 'Triage',
          timestamp: now,
          staffId: 'intake',
          note: 'Created through Smart Intake.',
        },
      ],
    };
    this.patients.push(patient);
    this.workflowLogService.record({
      type: 'patient_created',
      title: 'Patient created',
      summary: `Created patient ${patient.firstName} ${patient.lastName}.`,
      patientId: patient.id,
      actorStaffId: patient.assignedStaffId,
      source: 'emergency-patient-service',
      metadata: {
        mrn: patient.mrn,
        state: patient.state,
        priority,
      },
    });
    return clone(patient);
  }

  movePatientToState(
    patientId: string,
    to: EmergencyPatientState,
    options: {
      staffId?: string;
      note?: string;
      timestamp?: string;
      flags?: string[];
    } = {},
  ): EmergencyPatient {
    const index = this.patients.findIndex((patient) => patient.id === patientId);
    if (index === -1) throw new Error(`Emergency patient ${patientId} not found`);

    const patient = this.patients[index];
    const timestamp = options.timestamp || new Date().toISOString();
    const event = {
      id: createId('journey'),
      from: patient.state,
      to,
      timestamp,
      staffId: options.staffId || 'smart-intake',
      note: options.note || `Moved patient to ${to}.`,
    };

    this.patients[index] = {
      ...patient,
      state: to,
      triageTime: to === 'Triage' ? timestamp : patient.triageTime,
      flags: options.flags || patient.flags,
      timeline: [...patient.timeline, event],
    };
    this.workflowLogService.record({
      type: 'journey_state_changed',
      title: 'Journey state changed',
      summary: `Moved patient from ${patient.state} to ${to}.`,
      timestamp,
      patientId,
      actorStaffId: event.staffId,
      source: 'patient-journey-service',
      metadata: {
        fromState: patient.state,
        toState: to,
        journeyEventId: event.id,
      },
    });
    if (to === 'Admission' && patient.state !== 'Admission') {
      this.workflowLogService.record({
        type: 'boarding_started',
        title: 'Boarding started',
        summary: 'Patient moved to Admission boarding state.',
        timestamp,
        patientId,
        actorStaffId: event.staffId,
        source: 'boarding-service',
        severity: 'Warning',
        metadata: {
          fromState: patient.state,
          toState: to,
        },
      });
    }

    return clone(this.patients[index]);
  }

  computeCapacity(): CapacitySnapshot {
    const occupiedRooms = this.rooms.filter((room) => room.status === 'Occupied').length;
    const boardingCount = this.patients.filter(isBoarding).length;
    const reassessmentDue = this.patients.filter((patient) =>
      patient.flags.includes('ReassessmentDue'),
    ).length;
    const score = Math.min(
      100,
      Math.round(
        (occupiedRooms / Math.max(this.rooms.length, 1)) * 65 +
          boardingCount * 6 +
          reassessmentDue * 4,
      ),
    );
    const band: CapacitySnapshot['band'] =
      score >= 85 ? 'Red' : score >= 70 ? 'Orange' : score >= 50 ? 'Yellow' : 'Green';
    const snapshot = {
      score,
      band,
      totalPatients: this.patients.length,
      occupiedRooms,
      boardingCount,
      reassessmentDue,
      updatedAt: new Date().toISOString(),
    };
    if (this.lastCapacityScore !== undefined && this.lastCapacityScore !== score) {
      this.workflowLogService.record({
        type: 'capacity_score_changed',
        title: 'Capacity score changed',
        summary: `Capacity score changed from ${this.lastCapacityScore} to ${score}.`,
        source: 'capacity-service',
        severity: band === 'Red' ? 'Critical' : 'Warning',
        metadata: {
          fromScore: this.lastCapacityScore,
          toScore: score,
          band,
        },
      });
    }
    this.lastCapacityScore = score;
    return snapshot;
  }

  getPatientEnvelope(): EmergencyModuleEnvelope<{
    patients: EmergencyPatient[];
    staff: EmergencyStaff[];
    alerts: EmergencyAlert[];
  }> {
    return envelope('Patients', {
      patients: this.listPatients(),
      staff: this.listStaff(),
      alerts: this.listAlerts(),
    });
  }
}

@Injectable()
export class EmergencyWhiteboardService {
  constructor(private readonly patientService: EmergencyPatientService) {}

  getWhiteboard() {
    return envelope('Emergency Whiteboard', {
      patients: this.patientService.listPatients(),
      rooms: this.patientService.listRooms(),
      staff: this.patientService.listStaff(),
      alerts: this.patientService.listAlerts(),
      capacity: this.patientService.computeCapacity(),
    });
  }
}

@Injectable()
export class PatientJourneyService {
  constructor(private readonly patientService: EmergencyPatientService) {}

  getJourney() {
    const patients = this.patientService.listPatients();
    return envelope('Patient Journey Engine', {
      events: patients.flatMap((patient) =>
        patient.timeline.map((event) => ({
          ...event,
          patientId: patient.id,
          patientName: `${patient.firstName} ${patient.lastName}`.trim(),
          currentState: patient.state,
        })),
      ),
      stateCounts: patients.reduce<Record<string, number>>((counts, patient) => {
        counts[patient.state] = (counts[patient.state] || 0) + 1;
        return counts;
      }, {}),
    });
  }
}

@Injectable()
export class EMSIntakeService {
  constructor(private readonly patientService: EmergencyPatientService) {}

  getEMSIntake() {
    const patients = this.patientService
      .listPatients()
      .filter(
        (patient) =>
          patient.flags.includes('EMSArrival') ||
          /ems|ambulance|pre-arrival/i.test(patient.chiefComplaint),
      );
    return envelope('EMS Intake', {
      arrivals: patients.map((patient) => ({
        patient,
        etaMinutes: Math.max(1, 14 - minutesSince(patient.arrivalTime)),
        offloadRisk: isHighRisk(patient) ? 'high' : 'medium',
        handoffStatus: patient.state === 'Arrival' ? 'pre-arrival' : 'converted-to-patient',
      })),
      availableResusRooms: this.patientService
        .listRooms()
        .filter((room) => room.type === 'Resus' && room.status === 'Available').length,
    });
  }
}

@Injectable()
export class SmartIntakeService {
  constructor(private readonly patientService: EmergencyPatientService) {}

  getSmartIntake() {
    return envelope('Smart Intake', {
      mode: 'quick-intake',
      identityReview: [
        {
          id: 'provincial-unavailable',
          label: 'Provincial health lookup',
          status: 'unavailable',
          action: 'Continue with local MRN and manual review.',
        },
        {
          id: 'duplicate-check',
          label: 'Duplicate patient check',
          status: 'ready',
          action: 'Review candidate matches before chart merge.',
        },
      ],
      recentPatients: this.patientService.listPatients().slice(-3),
    });
  }

  createFromIntake(input: Partial<EmergencyPatient>) {
    const patient = this.patientService.createPatient(input);
    return envelope('Smart Intake', { patient });
  }

  createVerticalSlice(input: Partial<EmergencyPatient> & { staffId?: string }) {
    const now = new Date().toISOString();
    const staffId = input.staffId || input.assignedStaffId || 'smart-intake-rn';
    const requestedState = 'Arrival' as const;
    const arrivalEvent = {
      id: createId('journey'),
      to: requestedState,
      timestamp: input.arrivalTime || now,
      staffId,
      note: 'Smart Intake created patient and moved them to ARRIVAL.',
    };
    const patient = this.patientService.createPatient({
      ...input,
      state: requestedState,
      triageTime: undefined,
      timeline: [arrivalEvent],
    });
    const encounter: EmergencyEncounter = {
      id: input.id ? `encounter-${input.id}` : createId('encounter'),
      patientId: patient.id,
      status: 'active',
      source: 'smart-intake',
      createdAt: now,
      currentState: 'Triage',
      timelineEventIds: [arrivalEvent.id],
    };
    const reassessmentTriggered = requiresReassessment(patient);
    const flags = withUniqueFlags([
      ...patient.flags,
      ...(patient.priority === 'P1' || patient.priority === 'P2' ? ['HighRisk'] : []),
      ...(reassessmentTriggered ? ['ReassessmentDue'] : []),
    ]);
    const triagedPatient = this.patientService.movePatientToState(patient.id, 'Triage', {
      staffId,
      timestamp: now,
      flags,
      note: `Encounter ${encounter.id} created; patient moved from ARRIVAL to TRIAGE.`,
    });

    return {
      patient: triagedPatient,
      encounter: {
        ...encounter,
        timelineEventIds: triagedPatient.timeline.map((event) => event.id),
      },
      transitions: triagedPatient.timeline,
      reassessmentTriggered,
    };
  }
}

@Injectable()
export class QueueIntelligenceService {
  constructor(private readonly patientService: EmergencyPatientService) {}

  getQueues() {
    const patients = this.patientService.listPatients();
    const queueDefinitions = [
      ['Waiting', (patient: EmergencyPatient) => patient.state === 'Waiting', 30],
      ['Triage', (patient: EmergencyPatient) => patient.state === 'Triage', 10],
      ['Assessment', (patient: EmergencyPatient) => patient.state === 'Assessment', 45],
      ['Orders', (patient: EmergencyPatient) => patient.state === 'Orders', 60],
      ['Results', (patient: EmergencyPatient) => patient.state === 'Results', 90],
      [
        'Admission',
        (patient: EmergencyPatient) =>
          patient.state === 'Admission' || patient.flags.includes('PendingAdmission'),
        120,
      ],
      [
        'Reassessment',
        (patient: EmergencyPatient) => patient.flags.includes('ReassessmentDue'),
        30,
      ],
    ] as const;

    return envelope('Queue Intelligence', {
      queues: queueDefinitions.map(([label, predicate, targetMinutes]) => {
        const rows = patients.filter(predicate);
        const oldestWaitMinutes = rows.reduce(
          (max, patient) => Math.max(max, minutesSince(patient.arrivalTime)),
          0,
        );
        return {
          id: label.toLowerCase(),
          label,
          targetMinutes,
          count: rows.length,
          oldestWaitMinutes,
          breached: oldestWaitMinutes > targetMinutes,
          patients: rows,
        };
      }),
    });
  }
}

@Injectable()
export class ReassessmentService {
  constructor(private readonly patientService: EmergencyPatientService) {}

  getReassessmentQueue() {
    const patients = this.patientService
      .listPatients()
      .filter((patient) => patient.flags.includes('ReassessmentDue'));
    return envelope('Reassessment Engine', {
      patients,
      overdueCount: patients.filter((patient) => minutesSince(patient.arrivalTime) > 45).length,
      nextAction: patients.length
        ? 'Recheck vitals and pain score before disposition changes.'
        : 'No reassessments due.',
    });
  }
}

@Injectable()
export class CapacityService {
  constructor(private readonly patientService: EmergencyPatientService) {}

  getCapacity() {
    return envelope('Capacity Intelligence', {
      capacity: this.patientService.computeCapacity(),
      rooms: this.patientService.listRooms(),
      recommendations: [
        'Protect resus availability for EMS stroke arrival.',
        'Expedite boarder handoff with inpatient bed desk.',
      ],
    });
  }
}

@Injectable()
export class BoardingService {
  constructor(private readonly patientService: EmergencyPatientService) {}

  getBoarding() {
    const patients = this.patientService.listPatients().filter(isBoarding);
    return envelope('Boarding Intelligence', {
      patients,
      longestBoardingMinutes: patients.reduce(
        (max, patient) => Math.max(max, minutesSince(patient.arrivalTime)),
        0,
      ),
      escalation: patients.length
        ? 'Notify inpatient flow lead for pending admissions.'
        : 'No active boarding escalation.',
    });
  }
}

@Injectable()
export class ReferralService {
  constructor(private readonly patientService: EmergencyPatientService) {}

  getReferrals() {
    const patients = this.patientService
      .listPatients()
      .filter(
        (patient) => patient.state === 'Disposition' || isBoarding(patient) || isHighRisk(patient),
      );
    return envelope('Referral Intelligence', {
      referrals: patients.map((patient, index) => ({
        id: `ref-${patient.id}`,
        patient,
        specialty:
          patient.complaintCategory === 'Cardiac'
            ? 'Cardiology'
            : patient.complaintCategory === 'Mental Health'
              ? 'Psychiatry'
              : index % 2
                ? 'Internal Medicine'
                : 'Surgery',
        status: patient.flags.includes('PendingAdmission')
          ? 'accepted-waiting-bed'
          : 'review-needed',
        elapsedMinutes: minutesSince(patient.arrivalTime),
      })),
    });
  }
}

@Injectable()
export class ProvincialHealthService {
  constructor(
    private readonly patientService: EmergencyPatientService,
    private readonly workflowLogService: WorkflowActionLogService,
  ) {}

  getProvincialHealth() {
    const patients = this.patientService.listPatients().slice(0, 3);
    this.workflowLogService.record({
      type: 'provincial_data_viewed',
      title: 'Provincial data viewed',
      summary: `Viewed ${patients.length} provincial health placeholder records.`,
      source: 'provincial-health-service',
      metadata: {
        recordCount: patients.length,
        jurisdiction: 'Ontario/OHIP demo placeholder',
        connectorStatus: 'placeholder-unavailable',
      },
    });
    return envelope(
      'Provincial Health Connector',
      {
        connectorStatus: 'placeholder-unavailable',
        jurisdiction: 'Ontario/OHIP demo placeholder',
        records: patients.map((patient) => ({
          patientId: patient.id,
          mrn: patient.mrn,
          medications: ['Medication history requires provincial/EHR connector review'],
          allergies: ['Allergy history requires provincial/EHR connector review'],
          recentEncounters: ['External encounter feed not connected'],
        })),
      },
      ['No production provincial credential, adapter, or HIE/OHIP feed is connected.'],
    );
  }
}

@Injectable()
export class IntegrationHubService {
  constructor(private readonly workflowLogService: WorkflowActionLogService) {}

  getIntegrationHub() {
    this.workflowLogService.record({
      type: 'integration_event_received',
      title: 'Integration event received',
      summary: 'FHIR demo source status event received by Integration Hub.',
      source: 'integration-hub-service',
      severity: 'Warning',
      metadata: {
        sourceId: 'fhir-demo',
        connectorStatus: 'demo-ready',
      },
    });
    return envelope(
      'IoT/Integration Hub',
      {
        sources: [
          {
            id: 'fhir-demo',
            label: 'FHIR patient snapshot',
            status: 'demo-ready',
            lastEventAt: new Date().toISOString(),
          },
          { id: 'hl7-demo', label: 'HL7 ADT interface', status: 'placeholder', lastEventAt: null },
          {
            id: 'device-telemetry-demo',
            label: 'IoT vitals stream',
            status: 'placeholder',
            lastEventAt: null,
          },
        ],
        reviewQueue: [
          {
            id: 'integration-review-1',
            severity: 'Info',
            summary:
              'External feeds are labeled placeholders until live credentials are configured.',
          },
        ],
      },
      [
        'Live bedside monitor, MQTT/device gateway, HL7 MLLP, and provincial feeds remain future connectors.',
      ],
    );
  }
}

@Injectable()
export class EDCopilotService {
  constructor(
    private readonly patientService: EmergencyPatientService,
    private readonly workflowLogService: WorkflowActionLogService,
  ) {}

  getCopilotContext() {
    const patients = this.patientService.listPatients();
    this.workflowLogService.record({
      type: 'copilot_used',
      title: 'Copilot used',
      summary: 'ED Copilot context generated.',
      source: 'ed-copilot-service',
      metadata: {
        patientCount: patients.length,
        highRiskCount: patients.filter(isHighRisk).length,
      },
    });
    return envelope('ED Copilot', {
      promptContext: {
        patientCount: patients.length,
        highRiskCount: patients.filter(isHighRisk).length,
        reassessmentCount: patients.filter((patient) => patient.flags.includes('ReassessmentDue'))
          .length,
        capacity: this.patientService.computeCapacity(),
        safetyRule: 'Human review required. Do not make autonomous clinical decisions.',
      },
      quickActions: ['Who needs attention?', 'Capacity status', 'EMS update', 'Reassessment queue'],
    });
  }
}

@Injectable()
export class EmergencyAnalyticsService {
  constructor(private readonly patientService: EmergencyPatientService) {}

  getAnalytics() {
    const patients = this.patientService.listPatients();
    const activePatients = patients.filter((patient) => patient.state !== 'Discharge');
    const waits = activePatients.map((patient) => minutesSince(patient.arrivalTime));
    const averageWaitMinutes = waits.length
      ? Math.round(waits.reduce((sum, wait) => sum + wait, 0) / waits.length)
      : 0;
    return envelope('Analytics', {
      activeCensus: activePatients.length,
      waiting: activePatients.filter((patient) => patient.state === 'Waiting').length,
      highRisk: activePatients.filter(isHighRisk).length,
      boarding: activePatients.filter(isBoarding).length,
      reassessmentDue: activePatients.filter((patient) => patient.flags.includes('ReassessmentDue'))
        .length,
      averageWaitMinutes,
      capacity: this.patientService.computeCapacity(),
    });
  }
}

@Injectable()
export class EmergencySettingsService {
  private settings: EmergencyOsSettingsContract = clone(DEFAULT_EMERGENCY_OS_SETTINGS);

  getSettings() {
    return envelope('Settings', clone(this.settings));
  }

  updateSettings(patch: EmergencyOsSettingsPatch) {
    const next = mergeSettings(
      this.settings,
      (patch || {}) as Partial<EmergencyOsSettingsContract>,
    );
    const reassessmentIntervals =
      next.thresholds?.reassessmentIntervals || this.settings.thresholds.reassessmentIntervals;
    const reassessmentThresholds =
      next.reassessmentThresholds || this.settings.reassessmentThresholds;
    const capacityThresholds = next.capacityThresholds || this.settings.capacityThresholds;
    const emsThresholds = next.emsThresholds || this.settings.emsThresholds;

    this.settings = {
      ...next,
      departmentCapacityTarget:
        capacityThresholds.departmentCapacityTarget || next.departmentCapacityTarget,
      thresholds: {
        ...next.thresholds,
        capacityWarningPercent: capacityThresholds.warningPercent,
        emsOffloadTargetMinutes: emsThresholds.offloadTargetMinutes,
        reassessmentIntervals: {
          ...reassessmentIntervals,
          P1: reassessmentThresholds.P1,
          P2: reassessmentThresholds.P2,
          P3: reassessmentThresholds.P3,
          P4: reassessmentThresholds.P4,
          P5: reassessmentThresholds.P5,
        },
      },
      updatedAt: new Date().toISOString(),
    };

    return this.getSettings();
  }
}
