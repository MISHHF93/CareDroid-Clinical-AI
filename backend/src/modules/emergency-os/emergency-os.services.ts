import { Injectable, Optional } from '@nestjs/common';
import {
  calculateEmergencyOsCapacity,
  type EmergencyOsCapacityThresholds,
} from '../../../../lib/emergency-os/logic';
import { readAIProviderConfig } from '../../../../lib/ai/config';
import {
  EXTERNAL_DATA_REVIEW_DISCLAIMER,
  HUMAN_REVIEW_DISCLAIMER,
} from '../../../../lib/ai/safetyPolicy';
import { EmergencyRealtimeService } from './emergency-realtime.service';
import {
  emergencyAlertsFixture,
  emergencyPatientsFixture,
  emergencyRoomsFixture,
  emergencyStaffFixture,
} from './emergency-os.fixtures';
import type {
  CapacitySnapshot,
  CareDroidCentralNodeSnapshot,
  CareDroidScreenMode,
  CompleteImplementationReadinessContract,
  CompleteImplementationRequirement,
  CompleteImplementationRequirementClassification,
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
import { ensurePatientArrivalBlock } from './patient-arrival.sync';

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

function localDateKey(value: string | Date = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
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

function isDischargeReady(patient: EmergencyPatient): boolean {
  return patient.state === 'Disposition';
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

const aiProviderConfig = readAIProviderConfig();
const CARE_DROID_SCREEN_MODES: CareDroidScreenMode[] = [
  'TRIAGE_SCREEN',
  'REGISTRATION_SCREEN',
  'CHARGE_NURSE_SCREEN',
  'PHYSICIAN_SCREEN',
  'EMS_SCREEN',
  'WAITING_ROOM_DISPLAY',
  'COMMAND_CENTER_DISPLAY',
  'ADMIN_SCREEN',
  'READ_ONLY_DISPLAY',
];

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
  defaultScreenMode: 'CHARGE_NURSE_SCREEN',
  enabledScreenModes: CARE_DROID_SCREEN_MODES,
  readOnlyDisplayMode: false,
  commandCenterMode: true,
  wallDisplayRefreshInterval: 30000,
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
    provider: aiProviderConfig.provider,
    model: aiProviderConfig.model,
    triageAssistEnabled: false,
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
  operationalIntelligenceSettings: {
    operationalIntelligenceEnabled: true,
    operationalIntelligenceMode: 'rule_based',
    modelMonitoringEnabled: true,
    driftMonitoringEnabled: false,
    recommendationsEnabled: true,
    autoAlertingEnabled: true,
    humanReviewRequired: true,
    modelHealthVisibleToAdmins: true,
    dataFreshnessVisible: true,
    operationalIntelligencePollingInterval: 30000,
  },
  updatedAt: new Date(0).toISOString(),
};

const IMPLEMENTATION_CLASSIFICATIONS: CompleteImplementationRequirementClassification[] = [
  'ALREADY_IMPLEMENTED_COMPATIBLE',
  'SAFE_TO_IMPLEMENT_NOW',
  'PARTIALLY_IMPLEMENTED_NEEDS_EXTENSION',
  'CONFLICTS_WITH_ACTIVE_SPINE',
  'REQUIRES_MANUAL_APPROVAL',
  'DEMO_FACADE_ONLY',
];

const COMPLETE_IMPLEMENTATION_REQUIREMENTS: CompleteImplementationRequirement[] = [
  {
    id: 'active-vite-spa',
    requirement: 'Build the CareDroid frontend application shell and route surface.',
    classification: 'ALREADY_IMPLEMENTED_COMPATIBLE',
    activeSpineDecision:
      'Keep the active Vite React SPA under src/ with the existing AppShell and pilot route family.',
    implementationState:
      'src/App.jsx, src/components/AppShell.tsx, and the active CareDroid pages already define the mounted app spine.',
    evidence: ['src/App.jsx', 'src/components/AppShell.tsx', 'src/config/routes.config.js'],
    safeNextStep: 'Extend existing pages or service hooks only when a mounted route needs data.',
  },
  {
    id: 'new-frontend-src-shell',
    requirement: 'Create a new /frontend/src app shell, router, layout, and store.',
    classification: 'CONFLICTS_WITH_ACTIVE_SPINE',
    activeSpineDecision:
      'Do not create a duplicate frontend architecture while src/ is the active application.',
    implementationState:
      'frontend/src contains retained artifacts, but active runtime wiring uses src/ and should remain there.',
    evidence: [
      'src/App.jsx',
      'src/components/AppShell.tsx',
      'frontend/src/store/emergency-store.ts',
    ],
    safeNextStep:
      'Document any useful retained code before moving it to review with explicit approval.',
    approvalsRequired: ['Architecture owner approval before replacing the active SPA root.'],
  },
  {
    id: 'api-v1-surface',
    requirement: 'Switch or add the CareDroid API under /api/v1.',
    classification: 'CONFLICTS_WITH_ACTIVE_SPINE',
    activeSpineDecision: 'Keep canonical active calls on the Nest /api/emergency/* surface.',
    implementationState:
      'The Nest global prefix plus EmergencyOsController maps active endpoints to /api/emergency/*.',
    evidence: [
      'backend/src/main.ts',
      'backend/src/modules/emergency-os/emergency-os.controller.ts',
      'src/services/emergencyOsApi.js',
    ],
    safeNextStep: 'Add adapters under /api/emergency/* when current flows need them.',
    approvalsRequired: ['API versioning plan and frontend migration approval.'],
  },
  {
    id: 'backend-domain-models',
    requirement: 'Add backend models, interfaces, and services for CareDroid capabilities.',
    classification: 'PARTIALLY_IMPLEMENTED_NEEDS_EXTENSION',
    activeSpineDecision:
      'Use the existing Nest EmergencyOsModule and typed contracts instead of a parallel backend surface.',
    implementationState:
      'Core patient, queue, capacity, boarding, referral, settings, workflow-log, simulation, federated-learning, and digital-twin contracts exist as in-memory/demo services.',
    evidence: [
      'backend/src/modules/emergency-os/emergency-os.types.ts',
      'backend/src/modules/emergency-os/emergency-os.services.ts',
      'backend/src/modules/emergency-os/emergency-os.advanced-services.ts',
    ],
    safeNextStep:
      'Harden typed contracts and DTO adapters inside EmergencyOsModule before introducing persistence.',
  },
  {
    id: 'implementation-readiness-contract',
    requirement: 'Reconcile the complete implementation prompt against current repo state.',
    classification: 'SAFE_TO_IMPLEMENT_NOW',
    activeSpineDecision:
      'Expose a fixture-backed readiness registry from the existing CareDroid module for audits and docs.',
    implementationState:
      'Implemented as a typed /api/emergency/implementation-readiness contract in this safe slice.',
    evidence: [
      'backend/src/modules/emergency-os/emergency-os.types.ts',
      'backend/src/modules/emergency-os/emergency-os.services.ts',
      'backend/src/modules/emergency-os/emergency-os.controller.ts',
    ],
    safeNextStep: 'Keep the registry aligned whenever deferred items are promoted to real modules.',
  },
  {
    id: 'database-migrations',
    requirement: 'Run or add migrations for new CareDroid persistence.',
    classification: 'REQUIRES_MANUAL_APPROVAL',
    activeSpineDecision:
      'Do not run database migrations during reconciliation without explicit database target approval.',
    implementationState:
      'TypeORM migration commands exist, while active CareDroid services are fixture/in-memory backed.',
    evidence: ['backend/package.json', 'backend/src/app.module.ts'],
    safeNextStep:
      'Design persistence entities and dry-run migrations against a named local database first.',
    approvalsRequired: [
      'Database owner approval',
      'Target environment confirmation',
      'Rollback plan',
    ],
  },
  {
    id: 'legacy-cleanup',
    requirement: 'Delete legacy modules or run cleanup scripts to remove old surfaces.',
    classification: 'REQUIRES_MANUAL_APPROVAL',
    activeSpineDecision:
      'Do not delete broad modules in a dirty tree or while concurrent workers may be editing adjacent files.',
    implementationState:
      'Legacy and review-only surfaces remain in the repo; active navigation is already narrowed to CareDroid.',
    evidence: [
      'docs/architecture/legacy-platform-removal-report.md',
      'src/config/routes.config.js',
    ],
    safeNextStep:
      'Use non-destructive inventory reports or move explicitly approved files to _review.',
    approvalsRequired: ['File ownership approval', 'Current branch cleanup plan'],
  },
  {
    id: 'health-and-env',
    requirement: 'Add health checks and environment configuration for CareDroid dependencies.',
    classification: 'ALREADY_IMPLEMENTED_COMPATIBLE',
    activeSpineDecision:
      'Retain current health/config checks and keep optional integrations marked not-configured until wired.',
    implementationState:
      'Health checks cover database, service registry, websocket, MQTT, MoH FHIR, and wearable endpoints without requiring live credentials.',
    evidence: ['backend/src/api/health.routes.ts', 'backend/src/config/environment.config.ts'],
    safeNextStep: 'Add component checks only when a connector has real configuration and tests.',
  },
  {
    id: 'external-integrations',
    requirement: 'Wire MQTT, wearable RPM, MoH/FHIR, EMS, and other external integrations.',
    classification: 'DEMO_FACADE_ONLY',
    activeSpineDecision:
      'Keep integration contracts explicit placeholders until credentials, environments, and validation plans exist.',
    implementationState:
      'Integration and health surfaces report demo/placeholder/not-configured states rather than claiming live connectivity.',
    evidence: [
      'backend/src/modules/emergency-os/emergency-os.services.ts',
      'backend/src/api/health.routes.ts',
      'src/services/emergencyOsApi.js',
    ],
    safeNextStep:
      'Promote one connector at a time behind env configuration, contract tests, and operational runbooks.',
    approvalsRequired: [
      'Credential approval',
      'Security/privacy review',
      'Vendor/API environment confirmation',
    ],
  },
  {
    id: 'ai-governance-ml',
    requirement:
      'Implement deterioration ML, federated learning, AI governance, real-time simulation, and digital twin capabilities.',
    classification: 'DEMO_FACADE_ONLY',
    activeSpineDecision:
      'Keep advanced AI/ML as clearly labeled deterministic/demo facades until validated.',
    implementationState:
      'Simulation, federated learning, and digital twin endpoints return backend-fixture envelopes with remainingGaps.',
    evidence: [
      'backend/src/modules/emergency-os/emergency-os.advanced-services.ts',
      'backend/src/modules/emergency-os/emergency-os.controller.spec.ts',
    ],
    safeNextStep:
      'Require data provenance, validation metrics, clinical safety review, and governance signoff before production claims.',
    approvalsRequired: [
      'Clinical safety approval',
      'Model governance approval',
      'Data-use approval',
    ],
  },
  {
    id: 'install-migrate-devserver',
    requirement: 'Run npm install, migrations, cleanup commands, and long-running dev servers.',
    classification: 'REQUIRES_MANUAL_APPROVAL',
    activeSpineDecision:
      'Run only focused tests/build checks needed for the safe slice; avoid long-running or destructive commands.',
    implementationState:
      'Package scripts exist, but this reconciliation does not need dependency installation, real migrations, or dev server startup.',
    evidence: ['package.json', 'backend/package.json'],
    safeNextStep:
      'Request explicit approval with target command, expected side effects, and stop condition.',
    approvalsRequired: [
      'Dependency install approval',
      'Migration approval',
      'Dev server startup request',
    ],
  },
];

function buildImplementationSummary(
  requirements: CompleteImplementationRequirement[],
): Record<CompleteImplementationRequirementClassification, number> {
  return requirements.reduce(
    (summary, requirement) => {
      summary[requirement.classification] += 1;
      return summary;
    },
    Object.fromEntries(
      IMPLEMENTATION_CLASSIFICATIONS.map((classification) => [classification, 0]),
    ) as Record<CompleteImplementationRequirementClassification, number>,
  );
}

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
  upgrade_harness_used: 'Upgrade harness used',
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

  constructor(@Optional() private readonly realtimeService?: EmergencyRealtimeService) {}

  record(input: WorkflowActionInput): WorkflowActionLog {
    const timestamp = input.timestamp || new Date().toISOString();
    const log: WorkflowActionLog = {
      id: input.id || createId(`workflow-${input.type}`),
      type: input.type,
      action: input.type,
      title: input.title || WORKFLOW_LOG_TITLES[input.type],
      summary: input.summary,
      timestamp,
      userId: input.metadata?.userId ? String(input.metadata.userId) : input.actorStaffId,
      tenantId: input.metadata?.tenantId ? String(input.metadata.tenantId) : 'default-tenant',
      actorStaffId: input.actorStaffId,
      actorName: input.actorName,
      patientId: input.patientId,
      encounterId: input.metadata?.encounterId ? String(input.metadata.encounterId) : undefined,
      module: input.source || 'emergency-os-backend',
      purpose: input.metadata?.purpose
        ? String(input.metadata.purpose)
        : 'CareDroid operational workflow audit',
      result: input.status || 'recorded',
      error: input.metadata?.error ? String(input.metadata.error) : undefined,
      source: input.source || 'emergency-os-backend',
      severity: input.severity || 'Info',
      status: input.status || 'recorded',
      metadata: input.metadata || {},
    };
    this.logs.unshift(log);
    this.realtimeService?.publish({ type: 'workflow_log_created', payload: clone(log) });
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

  constructor(
    private readonly workflowLogService: WorkflowActionLogService,
    @Optional() private readonly realtimeService?: EmergencyRealtimeService,
  ) {}

  private isEmsPatient(patient: EmergencyPatient): boolean {
    return (
      patient.flags.includes('EMSArrival') ||
      /ems|ambulance|pre-arrival/i.test(patient.chiefComplaint)
    );
  }

  private publishPatientBoardRealtime(
    type: string,
    payload: unknown,
    patient?: EmergencyPatient,
  ): void {
    this.realtimeService?.publish({ type, payload });
    this.realtimeService?.publishBoardMutations();
    if (patient && this.isEmsPatient(patient)) {
      this.realtimeService?.publishEmsUpdate();
    }
  }

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
    const normalized = ensurePatientArrivalBlock(input);
    const state = normalized.state || 'Triage';
    const priority = normalized.priority || 'P3';
    const patient: EmergencyPatient = {
      id: normalized.id || createId('patient'),
      mrn: normalized.mrn || `ED-${Math.floor(100000 + Math.random() * 900000)}`,
      firstName: normalized.firstName || 'Unknown',
      lastName: normalized.lastName || 'Patient',
      dob: normalized.dob || now.slice(0, 10),
      age: Number.isFinite(normalized.age) ? Number(normalized.age) : 0,
      sex: normalized.sex || 'Other',
      arrivalTime: normalized.arrivalTime || now,
      triageTime: normalized.triageTime ?? (state === 'Triage' ? now : undefined),
      chiefComplaint: normalized.chiefComplaint || 'Unspecified complaint',
      complaintCategory: normalized.complaintCategory || 'Other',
      state,
      priority,
      vitals: (Array.isArray(normalized.vitals)
        ? normalized.vitals
        : normalized.vitals
          ? [normalized.vitals as unknown as EmergencyVitals]
          : []) as EmergencyVitals[],
      flags: normalized.flags || (priority === 'P1' || priority === 'P2' ? ['HighRisk'] : []),
      assignedStaffId: normalized.assignedStaffId,
      roomId: normalized.roomId,
      notes: normalized.notes || [],
      timeline: normalized.timeline || [
        {
          id: createId('journey'),
          to: state,
          timestamp: now,
          staffId: 'intake',
          note: 'Created through Smart Intake.',
        },
      ],
      arrivalMode: normalized.arrivalMode,
      registrationStatus: normalized.registrationStatus,
      triagePending: normalized.triagePending,
      firstContactAt: normalized.firstContactAt,
      queueDestination: normalized.queueDestination,
      arrival: normalized.arrival,
      triageAssist: normalized.triageAssist,
      triageAssistGeneratedAt: normalized.triageAssistGeneratedAt,
      quickSafetyFlags: normalized.quickSafetyFlags,
      highRiskComplaintFlags: normalized.highRiskComplaintFlags,
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
    const created = clone(patient);
    this.publishPatientBoardRealtime('patient_created', created, created);
    return created;
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

    const updated = clone(this.patients[index]);
    this.publishPatientBoardRealtime(
      'journey_state_changed',
      {
        patient: updated,
        journeyEvent: event,
      },
      updated,
    );
    return updated;
  }

  patchPatient(
    patientId: string,
    patch: Partial<Pick<EmergencyPatient, 'triageAssist' | 'triageAssistGeneratedAt' | 'priority'>>,
  ): EmergencyPatient {
    const index = this.patients.findIndex((patient) => patient.id === patientId);
    if (index === -1) throw new Error(`Emergency patient ${patientId} not found`);
    this.patients[index] = {
      ...this.patients[index],
      ...patch,
    };
    return clone(this.patients[index]);
  }

  computeCapacity(): CapacitySnapshot {
    const occupiedRooms = this.rooms.filter((room) => room.status === 'Occupied').length;
    const boardingCount = this.patients.filter(isBoarding).length;
    const reassessmentDue = this.patients.filter((patient) =>
      patient.flags.includes('ReassessmentDue'),
    ).length;
    const waitingCount = this.patients.filter((patient) => patient.state === 'Waiting').length;
    const dischargeReadyCount = this.patients.filter(isDischargeReady).length;
    const result = calculateEmergencyOsCapacity({
      totalPatients: this.patients.length,
      occupiedRooms,
      totalRooms: this.rooms.length,
      boardingCount,
      reassessmentDue,
      waitingCount,
      dischargeReadyCount,
      criticalEmsInboundCount: this.patients.filter(
        (patient) => patient.flags.includes('EMSArrival') && isHighRisk(patient),
      ).length,
      thresholds: {
        warningPercent: DEFAULT_EMERGENCY_OS_SETTINGS.capacityThresholds.warningPercent,
        orangePercent: DEFAULT_EMERGENCY_OS_SETTINGS.capacityThresholds.warningPercent,
        criticalPercent: DEFAULT_EMERGENCY_OS_SETTINGS.capacityThresholds.criticalPercent,
        boardingCriticalCount: DEFAULT_EMERGENCY_OS_SETTINGS.boardingThresholds.maxBoarders,
      } satisfies Partial<EmergencyOsCapacityThresholds>,
    });
    const score = result.score;
    const band: CapacitySnapshot['band'] = result.band;
    const snapshot = {
      score,
      band,
      totalPatients: this.patients.length,
      occupiedRooms,
      boardingCount,
      reassessmentDue,
      totalRooms: this.rooms.length,
      occupancyPercent: result.occupancyPercent,
      waitingCount,
      dischargeReadyCount,
      criticalEmsInboundCount: result.criticalEmsInboundCount,
      deductions: result.factors.map((factor) => ({
        id: factor.id,
        label: factor.label,
        value: factor.points,
      })),
      units: result.units,
      errors: result.errors,
      updatedAt: result.updatedAt,
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
      this.realtimeService?.publish({ type: 'capacity_updated', payload: snapshot });
      this.realtimeService?.publishBoardMutations();
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
    const arrivals = patients.map((patient) => ({
      patient,
      etaMinutes: Math.max(1, 14 - minutesSince(patient.arrivalTime)),
      offloadRisk: isHighRisk(patient) ? 'high' : 'medium',
      handoffStatus: patient.state === 'Arrival' ? 'pre-arrival' : 'converted-to-patient',
    }));
    const emsArrivals = arrivals
      .filter((row) => row.handoffStatus === 'pre-arrival')
      .map((row, index) => buildInboundEmsRecord(row, index));
    return envelope('EMS Intake', {
      arrivals,
      emsArrivals,
      incomingPatients: emsArrivals,
      availableResusRooms: this.patientService
        .listRooms()
        .filter((room) => room.type === 'Resus' && room.status === 'Available').length,
    });
  }
}

function emsSeverityFromPatient(patient: EmergencyPatient, offloadRisk: string): string {
  if (patient.priority === 'P1' || offloadRisk === 'high') return 'Critical';
  if (patient.priority === 'P2') return 'High';
  if (patient.priority === 'P4' || patient.priority === 'P5') return 'Low';
  return 'Moderate';
}

function buildInboundEmsRecord(
  row: {
    patient: EmergencyPatient;
    etaMinutes: number;
    offloadRisk: string;
    handoffStatus: string;
  },
  index: number,
) {
  const { patient, etaMinutes, offloadRisk } = row;
  const estimatedArrivalTime = new Date(Date.now() + etaMinutes * 60000).toISOString();
  const latestVitals = patient.vitals?.[patient.vitals.length - 1];
  return {
    id: `ems-arrival-${patient.id || index}`,
    patientId: undefined,
    unitId: patient.mrn || `EMS-${index + 1}`,
    unitName: patient.mrn || `EMS Unit ${index + 1}`,
    crewNames: ['EMS crew en route'],
    patientAge: patient.age,
    patientSex: patient.sex,
    chiefComplaint: patient.chiefComplaint.replace(/^EMS pre-arrival:\s*/i, ''),
    prearrivalComplaint: patient.chiefComplaint,
    vitals: latestVitals,
    eta: etaMinutes,
    etaMinutes,
    severity: emsSeverityFromPatient(patient, offloadRisk),
    dispatchTime: patient.arrivalTime,
    estimatedArrivalTime,
    status: 'Inbound' as const,
    priority: patient.priority,
    notes: patient.timeline?.[patient.timeline.length - 1]?.note || patient.chiefComplaint,
    mechanismOfInjury: patient.complaintCategory,
  };
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
export class ReceptionWorkspaceService {
  constructor(
    private readonly patientService: EmergencyPatientService,
    private readonly emsIntakeService: EMSIntakeService,
    private readonly queueService: QueueIntelligenceService,
    private readonly workflowLogService: WorkflowActionLogService,
  ) {}

  getSnapshot() {
    const patients = this.patientService.listPatients();
    const emsData = this.emsIntakeService.getEMSIntake().data as {
      emsArrivals?: ReturnType<typeof buildInboundEmsRecord>[];
      availableResusRooms?: number;
    };
    const inboundEms = emsData.emsArrivals || [];
    const queues = (this.queueService.getQueues().data as { queues?: unknown[] }).queues || [];

    const metrics = {
      recentArrivals: patients.filter((patient) => minutesSince(patient.arrivalTime) <= 30).length,
      waiting: patients.filter((patient) => patient.state === 'Waiting').length,
      awaitingVerification: patients.filter((patient) => patient.state === 'Registration').length,
      awaitingTriage: patients.filter((patient) => patient.state === 'Triage').length,
      emsInbound: inboundEms.length,
      availableResusRooms: emsData.availableResusRooms ?? 0,
    };

    return envelope('Reception Snapshot', {
      generatedAt: new Date().toISOString(),
      metrics,
      inboundEms,
      emsArrivals: inboundEms,
      awaitingVerificationPatients: patients
        .filter((patient) => patient.state === 'Registration')
        .slice(0, 12),
      preTriagePatients: patients.filter((patient) => patient.state === 'Triage').slice(0, 12),
      queues,
    });
  }

  completeHandoff(input: {
    patientId?: string;
    source?: string;
    actorName?: string;
    encounterId?: string | null;
    arrivalReason?: string;
    complaintCategory?: string;
    verificationSummary?: string;
    triageAssist?: import('../../../../lib/patient-orchestration').TriageAssistEnvelope;
    triageAssistGeneratedAt?: string;
  }) {
    const patientId = String(input.patientId || '').trim();
    if (!patientId) {
      return envelope('Reception Handoff', { ok: false, error: 'patientId is required' });
    }

    const patient = this.patientService.movePatientToState(patientId, 'Triage', {
      staffId: 'reception-handoff',
      note: `Reception handoff to triage queue (${input.source || 'reception'}).`,
    });

    this.workflowLogService.record({
      type: 'journey_state_changed',
      title: 'Reception handoff',
      summary: `Patient handed off from reception to triage queue (${input.source || 'reception'}).`,
      patientId,
      actorName: input.actorName,
      source: 'reception-workspace',
      metadata: {
        handoff: 'reception.handoff',
        source: input.source || 'reception',
        queue: 'Triage',
        targetState: 'Triage',
      },
    });

    if (input.triageAssist) {
      this.patientService.patchPatient(patientId, {
        triageAssist: input.triageAssist,
        triageAssistGeneratedAt: input.triageAssistGeneratedAt || input.triageAssist.generatedAt,
      });
    }

    return envelope('Reception Handoff', {
      ok: true,
      patientId,
      patient:
        this.patientService.listPatients().find((entry) => entry.id === patientId) || patient,
      triageAssist: input.triageAssist || patient.triageAssist || null,
      triageAssistGeneratedAt:
        input.triageAssistGeneratedAt ||
        input.triageAssist?.generatedAt ||
        patient.triageAssistGeneratedAt ||
        null,
      receptionPath: `/emergency/reception?arrived=${encodeURIComponent(patientId)}`,
      queuesPath: `/emergency/reception?queue=pretriage&patient=${encodeURIComponent(patientId)}`,
      whiteboardPath: `/emergency/whiteboard?patient=${encodeURIComponent(patientId)}${input.encounterId ? `&encounter=${encodeURIComponent(input.encounterId)}` : ''}`,
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

  private readonly createdReferrals: Array<Record<string, unknown>> = [];

  getReferrals() {
    const patients = this.patientService
      .listPatients()
      .filter(
        (patient) => patient.state === 'Disposition' || isBoarding(patient) || isHighRisk(patient),
      );
    return envelope('Referral Intelligence', {
      referrals: [
        ...patients.map((patient, index) => ({
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
        ...this.createdReferrals,
      ],
    });
  }

  createReferral(input: Record<string, unknown>) {
    const patientId = String(input.patientId || '');
    const patient = this.patientService
      .listPatients()
      .find((candidate) => candidate.id === patientId);
    const now = new Date().toISOString();
    const referral = {
      id: String(input.id || `ref-${patientId || 'patient'}-${Date.now()}`),
      patientId,
      patient,
      requestingStaffId: String(input.requestingStaffId || 'system-referrals'),
      targetDepartment: String(input.targetDepartment || 'Other'),
      specialty: String(input.targetDepartment || input.specialty || 'Other'),
      urgency: String(input.urgency || 'Routine'),
      reason: String(input.reason || 'Referral requested from CareDroid.'),
      clinicalSummary: String(input.clinicalSummary || input.reason || 'Clinical summary pending.'),
      status: String(input.status || 'Sent'),
      workflow: String(input.workflow || 'Referral'),
      requestedAt: String(input.requestedAt || now),
      createdAt: now,
    };

    this.createdReferrals.push(referral);

    return envelope('Referral Created', {
      referral,
      referrals: this.getReferrals().data.referrals,
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
        disclaimer: EXTERNAL_DATA_REVIEW_DISCLAIMER,
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
        safetyRule: HUMAN_REVIEW_DISCLAIMER,
      },
      quickActions: [
        'Queue bottlenecks',
        'Capacity status',
        'Boarding pressure',
        'Reassessment queue',
      ],
    });
  }

  processQuery(input: { query?: string; user_role?: string; context?: Record<string, unknown> }) {
    const query = String(input.query || '').trim();
    const lowerQuery = query.toLowerCase();
    const patients = this.patientService.listPatients();
    const capacity = this.patientService.computeCapacity();
    const reassessmentPatients = patients.filter(
      (patient) => patient.flags.includes('ReassessmentDue') || requiresReassessment(patient),
    );
    const emsPatients = patients.filter(
      (patient) =>
        patient.flags.includes('EMSArrival') ||
        /ems|ambulance|pre-arrival/i.test(patient.chiefComplaint),
    );
    let response =
      'Ask about longest wait, reassessment queue, EMS inbound, current capacity, or major clinical workflows.';
    let data: Record<string, unknown> = {
      supportedQueries: ['longest wait', 'reassessment', 'ems inbound', 'capacity', 'bottleneck'],
    };
    let requiresReview = false;

    if (lowerQuery.includes('waited longest') || lowerQuery.includes('longest wait')) {
      const longestWait = [...patients].sort(
        (left, right) => minutesSince(right.arrivalTime) - minutesSince(left.arrivalTime),
      )[0];
      response = longestWait
        ? `${longestWait.firstName} ${longestWait.lastName} has waited ${minutesSince(
            longestWait.arrivalTime,
          )} minutes and is currently in ${longestWait.state}.`
        : 'No active patients are available in the CareDroid fixture.';
      data = { patient: longestWait || null };
    } else if (lowerQuery.includes('reassessment') || lowerQuery.includes('needs attention')) {
      response = `${reassessmentPatients.length} patient(s) need reassessment or high-priority review.`;
      data = { patients: reassessmentPatients };
      requiresReview = reassessmentPatients.length > 0;
    } else if (lowerQuery.includes('ems') || lowerQuery.includes('ambulance')) {
      response = `${emsPatients.length} EMS/pre-arrival patient(s) are represented in the current ED board.`;
      data = { patients: emsPatients };
    } else if (lowerQuery.includes('capacity') || lowerQuery.includes('bottleneck')) {
      const waitingCount = patients.filter((patient) => patient.state === 'Waiting').length;
      const boardingCount = patients.filter(isBoarding).length;
      response = `Current capacity is ${capacity.band} at ${capacity.occupancyPercent}% occupancy with ${waitingCount} waiting and ${boardingCount} boarding.`;
      data = {
        capacity,
        waitingCount,
        boardingCount,
        reassessmentDue: reassessmentPatients.length,
      };
      requiresReview = capacity.band !== 'Green';
    } else if (lowerQuery.includes('chest pain')) {
      response = `Chest pain workflow: ECG within 10 minutes, troponin, aspirin if not contraindicated, and clinician-directed risk stratification. ${HUMAN_REVIEW_DISCLAIMER}`;
      data = {
        protocol: 'chest_pain',
        steps: ['ECG', 'Troponin', 'Aspirin', 'Risk stratification'],
      };
      requiresReview = true;
    } else if (lowerQuery.includes('sepsis')) {
      response = `Sepsis workflow: lactate, blood cultures before antibiotics, broad-spectrum antibiotics, fluids as appropriate, and escalation for shock. ${HUMAN_REVIEW_DISCLAIMER}`;
      data = { protocol: 'sepsis', steps: ['Lactate', 'Cultures', 'Antibiotics', 'Fluids'] };
      requiresReview = true;
    } else if (lowerQuery.includes('stroke')) {
      response = `Stroke workflow: last-known-well, NIHSS, non-contrast CT, CTA when indicated, and time-window review by the stroke team. ${HUMAN_REVIEW_DISCLAIMER}`;
      data = { protocol: 'stroke', steps: ['Last-known-well', 'NIHSS', 'CT', 'CTA'] };
      requiresReview = true;
    }

    this.workflowLogService.record({
      type: 'copilot_used',
      title: 'Copilot query processed',
      summary: query || 'Empty Copilot query received.',
      source: 'ed-copilot-query',
      metadata: {
        userRole: input.user_role || 'unknown',
        requiresReview,
      },
    });

    return envelope('ED Copilot Query', {
      id: createId('copilot-query'),
      query,
      response,
      answer: response,
      message: response,
      data,
      requires_review: requiresReview,
      safetyStatus: requiresReview ? 'review-required' : 'safe',
      safety_check_passed: true,
      safetyNotice: HUMAN_REVIEW_DISCLAIMER,
      userRole: input.user_role || 'unknown',
      createdAt: new Date().toISOString(),
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
export class CompleteImplementationReadinessService {
  getReadiness(): EmergencyModuleEnvelope<CompleteImplementationReadinessContract> {
    return envelope(
      'Complete Implementation Prompt Reconciliation',
      {
        activeSpine: {
          frontendRoot: 'src/',
          appEntry: 'src/App.jsx',
          appShell: 'src/components/AppShell.tsx',
          backendModule: 'backend/src/modules/emergency-os',
          apiBase: '/api/emergency',
          pilotRouteCount: 12,
        },
        generatedBy: 'EmergencyOsModule safe-slice reconciliation registry',
        clinicalSafetyNotice:
          'Demo, fixture, and facade outputs are not clinical validation, production readiness, live integration status, or measured model performance.',
        summary: buildImplementationSummary(COMPLETE_IMPLEMENTATION_REQUIREMENTS),
        requirements: clone(COMPLETE_IMPLEMENTATION_REQUIREMENTS),
      },
      [
        'Persistence migrations, destructive cleanup, /api/v1 migration, and duplicate frontend architecture are intentionally deferred.',
      ],
    );
  }
}

@Injectable()
export class EmergencySettingsService {
  private readonly defaultSettings = clone(DEFAULT_EMERGENCY_OS_SETTINGS);
  private readonly byOrganization = new Map<string, EmergencyOsSettingsContract>();

  private organizationKey(organizationId?: string): string {
    const normalized = String(organizationId || '').trim();
    return normalized || '__global__';
  }

  private materializeSettings(organizationId?: string): EmergencyOsSettingsContract {
    const key = this.organizationKey(organizationId);
    if (!this.byOrganization.has(key)) {
      this.byOrganization.set(key, clone(this.defaultSettings));
    }
    return this.byOrganization.get(key)!;
  }

  getSettings(organizationId?: string) {
    return envelope('Settings', clone(this.materializeSettings(organizationId)));
  }

  updateSettings(patch: EmergencyOsSettingsPatch, organizationId?: string) {
    const key = this.organizationKey(organizationId);
    const current = this.materializeSettings(organizationId);
    const next = mergeSettings(current, (patch || {}) as Partial<EmergencyOsSettingsContract>);
    const reassessmentIntervals =
      next.thresholds?.reassessmentIntervals || current.thresholds.reassessmentIntervals;
    const reassessmentThresholds = next.reassessmentThresholds || current.reassessmentThresholds;
    const capacityThresholds = next.capacityThresholds || current.capacityThresholds;
    const emsThresholds = next.emsThresholds || current.emsThresholds;

    const merged: EmergencyOsSettingsContract = {
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

    this.byOrganization.set(key, merged);
    return this.getSettings(organizationId);
  }
}

@Injectable()
export class CareDroidCentralNodeService {
  constructor(
    private readonly patientService: EmergencyPatientService,
    private readonly settingsService: EmergencySettingsService,
    private readonly workflowLogService: WorkflowActionLogService,
  ) {}

  getSnapshot(): EmergencyModuleEnvelope<CareDroidCentralNodeSnapshot> {
    const generatedAt = new Date().toISOString();
    const patients = this.patientService.listPatients();
    const activePatients = patients.filter((patient) => patient.state !== 'Discharge');
    const waitingPatients = activePatients.filter((patient) => patient.state === 'Waiting');
    const waits = activePatients.map((patient) => minutesSince(patient.arrivalTime));
    const capacity = this.patientService.computeCapacity();
    const settings = this.settingsService.getSettings().data;
    const operationalAlerts = this.patientService
      .listAlerts()
      .filter((alert) => !alert.dismissed)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const emsInbound = activePatients.filter(
      (patient) =>
        patient.flags.includes('EMSArrival') ||
        /ems|ambulance|pre-arrival/i.test(patient.chiefComplaint),
    ).length;
    const boarders = activePatients.filter(isBoarding).length;
    const referralsPending = activePatients.filter(
      (patient) => patient.state === 'Disposition' || isBoarding(patient) || isHighRisk(patient),
    ).length;
    const reassessmentsDue = activePatients.filter((patient) =>
      patient.flags.includes('ReassessmentDue'),
    ).length;
    const states: Array<EmergencyPatientState | 'Reassessment' | 'EMS'> = [
      'Arrival',
      'Registration',
      'Triage',
      'Waiting',
      'Assessment',
      'Orders',
      'Results',
      'Disposition',
      'Admission',
      'Reassessment',
      'EMS',
    ];
    const targetByQueue: Record<string, number> = {
      Arrival: 5,
      Registration: 10,
      Triage: 10,
      Waiting: settings.thresholds.waitWarningMinutes,
      Assessment: 45,
      Orders: 60,
      Results: 90,
      Disposition: 60,
      Admission: settings.boardingThresholds.escalationMinutes,
      Reassessment: 30,
      EMS: settings.emsThresholds.offloadTargetMinutes,
    };
    const patientsForQueue = (queue: EmergencyPatientState | 'Reassessment' | 'EMS') =>
      activePatients.filter((patient) => {
        if (queue === 'Reassessment') return patient.flags.includes('ReassessmentDue');
        if (queue === 'EMS') {
          return (
            patient.flags.includes('EMSArrival') ||
            /ems|ambulance|pre-arrival/i.test(patient.chiefComplaint)
          );
        }
        return patient.state === queue;
      });

    return envelope('CareDroid Central Node', {
      node: 'CareDroidCentralNode',
      generatedAt,
      patientsToday: patients.filter(
        (patient) => localDateKey(patient.arrivalTime) === localDateKey(),
      ).length,
      activePatients: activePatients.length,
      waitingPatients: waitingPatients.length,
      longestWait: waits.reduce((max, wait) => Math.max(max, wait), 0),
      averageWait: waits.length
        ? Math.round(waits.reduce((sum, wait) => sum + wait, 0) / waits.length)
        : 0,
      emsInbound,
      emsPressure:
        emsInbound >= 4 ||
        activePatients.some(
          (patient) => patient.flags.includes('EMSArrival') && isHighRisk(patient),
        )
          ? 'critical'
          : emsInbound >= 2
            ? 'strained'
            : emsInbound === 1
              ? 'watch'
              : 'normal',
      reassessmentsDue,
      capacityStatus: capacity,
      boarders,
      boardingRisk:
        boarders >= settings.boardingThresholds.maxBoarders
          ? 'critical'
          : boarders >= Math.ceil(settings.boardingThresholds.maxBoarders * 0.7)
            ? 'strained'
            : boarders > 0
              ? 'watch'
              : 'normal',
      referralsPending,
      operationalAlerts,
      whiteboardColumns: states.map((state) => {
        const rows = patientsForQueue(state);
        return {
          id: state,
          label: state,
          patientIds: rows.map((patient) => patient.id),
          count: rows.length,
        };
      }),
      queueMetrics: states.map((state) => {
        const rows = patientsForQueue(state);
        const oldestWaitMinutes = rows.reduce(
          (max, patient) => Math.max(max, minutesSince(patient.arrivalTime)),
          0,
        );
        const targetMinutes = targetByQueue[state] || settings.thresholds.waitWarningMinutes;
        return {
          id: String(state).toLowerCase(),
          label: state,
          count: rows.length,
          oldestWaitMinutes,
          targetMinutes,
          breached: rows.length > 0 && oldestWaitMinutes > targetMinutes,
        };
      }),
      recentEvents: this.workflowLogService.listLogs().slice(0, 12),
      tenantSettings: settings,
      enabledModules: settings.enabledModules
        .filter((module) => module.enabled)
        .map((module) => module.id),
    });
  }
}
