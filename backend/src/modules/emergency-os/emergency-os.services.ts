import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  OnModuleInit,
} from '@nestjs/common';
// OnModuleInit used by EmergencyPatientService board rehydrate
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import {
  calculateEmergencyOsCapacity,
  isEmergencyOsBoarding,
  type EmergencyOsCapacityThresholds,
} from '../../../../lib/emergency-os/logic';
import { readAIProviderConfig } from '../../../../lib/ai/config';
import {
  EXTERNAL_DATA_REVIEW_DISCLAIMER,
  HUMAN_REVIEW_DISCLAIMER,
} from '../../../../lib/ai/safetyPolicy';
import { CigProjectionFacade } from '../cig/cig-projection.facade';
import { EmergencyRealtimeService } from './emergency-realtime.service';
import { CollaborationHubService } from '../collaboration-hub/collaboration-hub.service';
import { CollaborationMessageSourceType } from '../collaboration-hub/entities/collaboration-message.entity';
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
import {
  DUPLICATE_HIGH_CONFIDENCE_THRESHOLD,
  DUPLICATE_MANUAL_REVIEW_THRESHOLD,
  findPatientDuplicateCandidates,
  type PatientDuplicateCandidate,
} from './patient-duplicate-detection';
import { Patient } from './entities/patient.entity';
import { Alert } from './entities/alert.entity';
import { Referral as ReferralEntity } from './entities/referral.entity';
import { EmsArrivalStatus } from './entities/ems-arrival-status.entity';
import { EmergencyOsSettingsEntity } from './entities/emergency-os-settings.entity';
import { EmailService } from '../email/email.service';
import { getEnvironmentConfig } from '../../config/environment.config';
import { WorkflowActionLogEntry } from './entities/workflow-action-log-entry.entity';
import { EncryptionService } from '../encryption/encryption.service';

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
  return isEmergencyOsBoarding(patient);
}

function isDischargeReady(patient: EmergencyPatient): boolean {
  return patient.state === 'Disposition';
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
  const vitals = Array.isArray(patient.vitals)
    ? patient.vitals.at(-1) || {}
    : ((patient.vitals || {}) as Partial<EmergencyVitals>);
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

/**
 * Some callers (e.g. Smart Intake's vertical-slice flow) build flags as
 * `{ type, reason, severity, detectedAt }` objects rather than the canonical
 * `string[]`. Coerce to canonical shape here — the single patient-creation
 * choke point — so a corrupted array can never reach `.includes(PatientFlag.X)`
 * checks elsewhere in the app, where an object entry would silently never match.
 */
function normalizePatientFlags(rawFlags: unknown): string[] {
  if (!Array.isArray(rawFlags)) return [];
  const normalized = rawFlags
    .map((flag) => {
      if (typeof flag === 'string') return flag;
      if (
        flag &&
        typeof flag === 'object' &&
        typeof (flag as { type?: unknown }).type === 'string'
      ) {
        return (flag as { type: string }).type;
      }
      return null;
    })
    .filter((flag): flag is string => Boolean(flag));
  return withUniqueFlags(normalized);
}

/**
 * Some callers (e.g. Smart Intake's vertical-slice flow, via
 * `normalizeSmartIntakeVitals`) send blood pressure as `bpSystolic`/
 * `bpDiastolic` rather than the canonical `EmergencyVitals.sbp`/`.dbp`, and
 * omit `recordedBy` entirely. Widely-consumed hypotension/reassessment logic
 * (alertEngine, reassessmentEngine, qSOFA, clinical-protocol/deterioration
 * services) reads `.sbp`/`.dbp` directly — normalize here, the single
 * patient-creation choke point, so BP never silently goes missing.
 */
function normalizeVitalsEntry(
  raw: Record<string, unknown>,
  fallbackStaffId: string,
  now: string,
): EmergencyVitals {
  const sbp = raw.sbp ?? raw.bpSystolic;
  const dbp = raw.dbp ?? raw.bpDiastolic;
  return {
    ...(raw as Partial<EmergencyVitals>),
    sbp: typeof sbp === 'number' ? sbp : undefined,
    dbp: typeof dbp === 'number' ? dbp : undefined,
    recordedAt: (raw.recordedAt as string) || now,
    recordedBy: (raw.recordedBy as string) || fallbackStaffId,
  } as EmergencyVitals;
}

function normalizePatientVitals(
  rawVitals: unknown,
  fallbackStaffId: string,
  now: string,
): EmergencyVitals[] {
  const list = Array.isArray(rawVitals) ? rawVitals : rawVitals ? [rawVitals] : [];
  return list
    .filter(
      (entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object',
    )
    .map((entry) => normalizeVitalsEntry(entry, fallbackStaffId, now));
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
  administrative_automation_reviewed: 'Administrative automation reviewed',
  staff_assigned: 'Staff assigned',
  patient_note_added: 'Patient note added',
  operational_alert_dispatched: 'Operational alert dispatched',
  patient_escalated: 'Patient escalated',
  patient_duplicate_flagged: 'Duplicate patient flagged',
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

const WORKFLOW_LOG_BUFFER_LIMIT = 500;

const COLLABORATION_NOTABLE_WORKFLOW_TYPES = new Set<WorkflowActionType>([
  'journey_state_changed',
  'clinician_assigned',
  'reassessment_completed',
  'boarding_started',
  'referral_created',
  'patient_escalated',
  'patient_note_added',
]);

@Injectable()
export class WorkflowActionLogService implements OnModuleInit {
  private readonly logger = new Logger(WorkflowActionLogService.name);
  private readonly logs: WorkflowActionLog[] = [];

  constructor(
    @Optional() private readonly realtimeService?: EmergencyRealtimeService,
    @Optional() private readonly collaborationHubService?: CollaborationHubService,
    @Optional()
    @InjectRepository(WorkflowActionLogEntry)
    private readonly journal?: Repository<WorkflowActionLogEntry>,
  ) {}

  /**
   * Rehydrate the in-process buffer from the durable journal (Cycle 92).
   * Newest `WORKFLOW_LOG_BUFFER_LIMIT` rows, matching the buffer's own
   * eviction policy so a restart doesn't resurrect entries record() would
   * already have evicted.
   */
  async onModuleInit(): Promise<void> {
    if (!this.journal) return;
    try {
      const rows = await this.journal.find({
        order: { timestamp: 'DESC' },
        take: WORKFLOW_LOG_BUFFER_LIMIT,
      });
      for (const row of rows) {
        try {
          this.logs.push(JSON.parse(row.payload) as WorkflowActionLog);
        } catch {
          // A corrupt payload must not block startup; skip that row.
        }
      }
    } catch {
      // Journal unavailable (e.g. migrations not run yet): stay in-memory.
    }
  }

  /** Fire-and-forget write-through; a journal failure never breaks the synchronous log contract. */
  private persist(log: WorkflowActionLog): void {
    if (!this.journal) return;
    void this.journal
      .save({
        id: log.id,
        tenantId: log.tenantId ?? null,
        patientId: log.patientId ?? null,
        type: log.type,
        timestamp: log.timestamp,
        payload: JSON.stringify(log),
      })
      .catch((error) => {
        // HEAL-252: this is the durable half of the ED workflow action log
        // (escalations, state transitions) that onModuleInit rehydrates
        // from on restart -- a dropped write here left a gap in that
        // durable record with zero trace anywhere it happened. Same gap as
        // AiActionProposalService's persist()/appendAuditEntry (HEAL-251).
        this.logger.error(
          `Failed to persist workflow action log ${log.id} (${log.type})`,
          error instanceof Error ? error.stack : String(error),
        );
      });
  }

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
    if (this.logs.length > WORKFLOW_LOG_BUFFER_LIMIT) {
      this.logs.length = WORKFLOW_LOG_BUFFER_LIMIT;
    }
    this.persist(log);
    this.realtimeService?.publish({ type: 'workflow_log_created', payload: clone(log) });
    void this.syncToCollaborationHub(log).catch(() => {
      // Best-effort side channel — never let a collaboration sync failure affect workflow logging.
    });
    return clone(log);
  }

  /**
   * Mirrors operationally-notable workflow events into the patient's
   * auto-created Collaboration Hub thread, and escalations into an incident
   * channel. There is no formal domain event bus in this codebase
   * (no EventEmitter2/@OnEvent usage was found) — this direct call from the
   * single, already-centralized WorkflowActionLogService.record() is the
   * lowest-risk integration point that still reaches all 12+ call sites.
   */
  private async syncToCollaborationHub(log: WorkflowActionLog): Promise<void> {
    if (!this.collaborationHubService) return;
    const organizationId = log.tenantId || 'default-tenant';

    if (log.patientId) {
      const channel = await this.collaborationHubService.getOrCreatePatientThread(
        organizationId,
        log.patientId,
      );

      if (COLLABORATION_NOTABLE_WORKFLOW_TYPES.has(log.type)) {
        await this.collaborationHubService.postSystemMessage(channel.id, {
          body: log.summary || log.title,
          sourceType: CollaborationMessageSourceType.WORKFLOW_EVENT,
          sourceId: log.id,
        });
      }

      const dischargeHeuristicText = [log.summary, log.title, JSON.stringify(log.metadata || {})]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (log.type === 'journey_state_changed' && dischargeHeuristicText.includes('discharge')) {
        await this.collaborationHubService.archivePatientThread(
          organizationId,
          log.patientId,
          'discharge',
        );
      }
    }

    if (log.type === 'patient_escalated') {
      const { channel, created } = await this.collaborationHubService.createIncidentChannel(
        organizationId,
        {
          title: log.title,
          description: log.summary,
          severity: 'high',
          triggerType: 'patient_escalated',
          patientId: log.patientId,
          sourceId: log.id,
        },
      );
      if (created) {
        await this.collaborationHubService.postSystemMessage(channel.id, {
          body: log.summary || log.title,
          sourceType: CollaborationMessageSourceType.ESCALATION,
        });
      }
    }
  }

  getDiagnostics() {
    const severityCounts = this.logs.reduce<Record<string, number>>((counts, log) => {
      const key = log.severity || 'Info';
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});
    return {
      bufferedLogs: this.logs.length,
      severityCounts,
      recentTypes: [...new Set(this.logs.slice(0, 20).map((log) => log.type))],
      oldestTimestamp: this.logs[this.logs.length - 1]?.timestamp,
      newestTimestamp: this.logs[0]?.timestamp,
    };
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

/**
 * In-memory-authoritative: every per-request read/write goes through
 * `this.patients` directly; `persistPatientToDatabase()` is fire-and-forget,
 * for durability/rehydration only, never read from during normal operation.
 * This is safe against reentrancy/races today *only* because every
 * per-request method body is fully synchronous (no `await`), which makes it
 * atomic under Node's run-to-completion model. Do not add an `await` inside
 * a read-modify-write method (e.g. an async validation call) without first
 * re-reading SCORECARD.md roadmap item #2 — doing so would silently
 * reintroduce a real race condition. `emergency-patient-atomicity-invariant.spec.ts`
 * enforces this mechanically.
 */
@Injectable()
export class EmergencyPatientService implements OnModuleInit {
  private readonly logger = new Logger(EmergencyPatientService.name);
  private readonly patients: EmergencyPatient[] = clone(emergencyPatientsFixture);
  private readonly rooms: EmergencyRoom[] = clone(emergencyRoomsFixture);
  private readonly staff: EmergencyStaff[] = clone(emergencyStaffFixture);
  private readonly alerts: EmergencyAlert[] = clone(emergencyAlertsFixture);
  private lastCapacityScore: number | undefined;
  private boardRehydrated = false;

  constructor(
    private readonly workflowLogService: WorkflowActionLogService,
    @Optional() private readonly realtimeService?: EmergencyRealtimeService,
    @Optional()
    @InjectRepository(Patient)
    private readonly patientRepository?: Repository<Patient>,
    @Optional() private readonly encryptionService?: EncryptionService,
    @Optional()
    @InjectRepository(Alert)
    private readonly alertRepository?: Repository<Alert>,
    /** PR-5b: Mode B CIG shadow projection after board mutations */
    @Optional() private readonly cigProjection?: CigProjectionFacade,
  ) {
    for (const alert of this.alerts) {
      this.persistAlertToDatabase(alert);
    }
  }

  /**
   * Load durable patients (and open alerts) from TypeORM so create/handoff
   * survives process restart. Empty tables keep the demo fixture board.
   */
  async onModuleInit(): Promise<void> {
    await this.rehydrateBoardFromDatabase();
  }

  isBoardRehydratedFromDatabase(): boolean {
    return this.boardRehydrated;
  }

  private mapEntityToEmergencyPatient(entity: Patient): EmergencyPatient {
    const now = new Date().toISOString();
    return ensurePatientArrivalBlock({
      id: entity.id,
      mrn: entity.mrn,
      firstName: entity.firstName,
      lastName: entity.lastName,
      dob: entity.dob,
      age: Number(entity.age) || 0,
      sex: entity.sex as EmergencyPatient['sex'],
      arrivalTime: entity.arrivalTime || now,
      triageTime: entity.triageTime,
      chiefComplaint: entity.chiefComplaint || 'Unspecified complaint',
      complaintCategory: entity.complaintCategory || 'Other',
      state: (entity.state as EmergencyPatient['state']) || 'Triage',
      priority: (entity.priority as EmergencyPatient['priority']) || 'P3',
      vitals: Array.isArray(entity.vitals) ? (entity.vitals as EmergencyPatient['vitals']) : [],
      flags: Array.isArray(entity.flags) ? entity.flags : [],
      assignedStaffId: entity.assignedStaffId,
      roomId: entity.roomId,
      notes: Array.isArray(entity.notes) ? (entity.notes as EmergencyPatient['notes']) : [],
      timeline: Array.isArray(entity.timeline)
        ? (entity.timeline as EmergencyPatient['timeline'])
        : [],
      triageAssist: entity.triageAssist as EmergencyPatient['triageAssist'],
      triageAssistGeneratedAt: entity.triageAssistGeneratedAt,
      arrivalMode: entity.arrivalMode as EmergencyPatient['arrivalMode'],
      registrationStatus: entity.registrationStatus as EmergencyPatient['registrationStatus'],
      triagePending: entity.triagePending,
      firstContactAt: entity.firstContactAt,
      queueDestination: entity.queueDestination as EmergencyPatient['queueDestination'],
      arrival: entity.arrival as EmergencyPatient['arrival'],
      quickSafetyFlags: entity.quickSafetyFlags as EmergencyPatient['quickSafetyFlags'],
      highRiskComplaintFlags:
        entity.highRiskComplaintFlags as EmergencyPatient['highRiskComplaintFlags'],
    }) as EmergencyPatient;
  }

  private async rehydrateBoardFromDatabase(): Promise<void> {
    if (!this.patientRepository) {
      this.logger.log('Patient repository unavailable — board remains fixture-seeded');
      return;
    }
    try {
      const rows = await this.patientRepository.find({
        order: { arrivalTime: 'DESC' },
        take: 500,
      });
      if (!rows.length) {
        this.logger.log('No durable patients in database — keeping fixture seed board');
        // Ensure fixture seed is written through so a cold DB starts gaining durable rows.
        for (const patient of this.patients) {
          this.persistPatientToDatabase(patient);
        }
        return;
      }

      const hydrated = rows.map((row) => this.mapEntityToEmergencyPatient(row));
      this.patients.splice(0, this.patients.length, ...hydrated);
      this.boardRehydrated = true;
      this.logger.log(`Rehydrated emergency board with ${hydrated.length} durable patient(s)`);

      if (this.alertRepository) {
        try {
          const alertRows = await this.alertRepository.find({
            where: { dismissed: false },
            order: { dispatchedAt: 'DESC' },
            take: 100,
          });
          if (alertRows.length) {
            const mapped: EmergencyAlert[] = alertRows.map((row) => ({
              id: row.id,
              severity: (row.severity as EmergencyAlert['severity']) || 'Warning',
              title: row.title,
              message: row.message,
              patientId: row.patientId,
              createdAt: row.dispatchedAt || new Date().toISOString(),
              dismissed: Boolean(row.dismissed),
            }));
            this.alerts.splice(0, this.alerts.length, ...mapped);
            this.logger.log(`Rehydrated ${mapped.length} open alert(s) from database`);
          }
        } catch (alertError) {
          this.logger.warn(`Alert rehydrate skipped: ${alertError}`);
        }
      }
    } catch (error) {
      this.logger.warn(
        `Board rehydrate failed — continuing with fixture seed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Best-effort Mode B CIG project of the full in-memory board.
   * Never throws; never blocks the synchronous mutator response.
   * Multi-user durable twin is NOT claimed (session durability only).
   */
  private projectCigBoard(sourceEventName: string, eventId?: string): void {
    if (!this.cigProjection) return;
    const tenantId = process.env.CIG_DEFAULT_TENANT_ID?.trim() || 'emergency-os-default';
    const staffLoad = new Map<string, number>();
    for (const patient of this.patients) {
      if (!patient.assignedStaffId) continue;
      if (patient.state === 'Discharge') continue;
      staffLoad.set(patient.assignedStaffId, (staffLoad.get(patient.assignedStaffId) || 0) + 1);
    }
    void this.cigProjection
      .afterBoardMutation({
        tenantId,
        mode: 'B',
        sourceEventName,
        eventId,
        producer: 'EmergencyPatientService',
        board: {
          patients: this.patients,
          rooms: this.rooms,
          staff: this.staff.map((member) => ({
            ...member,
            activePatients: staffLoad.get(member.id) ?? 0,
          })),
          alerts: this.alerts,
        },
      })
      .then((result) => {
        if (!result.ok) {
          this.logger.warn(
            `CIG Mode B projection failed after ${sourceEventName}: ${result.error}`,
          );
        }
      })
      .catch((error) => {
        this.logger.warn(`CIG Mode B projection threw after ${sourceEventName}: ${error}`);
      });
  }

  /**
   * Phase 1 of the DB migration: best-effort, non-blocking write-through to
   * the real `patients` table, called from every mutator (create/update,
   * state transitions, staff assignment, notes, escalation). Reads still
   * come from the in-memory array — this only keeps the table current so
   * real data exists to cut reads over to in a later phase. Never throws;
   * a failed write here must not break the synchronous in-memory response.
   */
  private persistPatientToDatabase(patient: EmergencyPatient): void {
    if (!this.patientRepository) return;
    const piiFieldsEncrypted = Boolean(this.encryptionService);
    const entity = this.patientRepository.create({
      id: patient.id,
      mrn: patient.mrn,
      mrnEncrypted: this.encryptionService?.encryptToBuffer(patient.mrn),
      firstName: patient.firstName,
      firstNameEncrypted: this.encryptionService?.encryptToBuffer(patient.firstName),
      lastName: patient.lastName,
      lastNameEncrypted: this.encryptionService?.encryptToBuffer(patient.lastName),
      dob: patient.dob,
      dobEncrypted: this.encryptionService?.encryptToBuffer(patient.dob),
      piiFieldsEncrypted,
      age: patient.age,
      sex: patient.sex,
      arrivalTime: patient.arrivalTime,
      triageTime: patient.triageTime,
      chiefComplaint: patient.chiefComplaint,
      complaintCategory: patient.complaintCategory,
      state: patient.state,
      priority: patient.priority,
      vitals: patient.vitals,
      flags: patient.flags,
      assignedStaffId: patient.assignedStaffId,
      roomId: patient.roomId,
      notes: patient.notes,
      timeline: patient.timeline,
      triageAssist: patient.triageAssist,
      triageAssistGeneratedAt: patient.triageAssistGeneratedAt ?? undefined,
      arrivalMode: patient.arrivalMode,
      registrationStatus: patient.registrationStatus,
      triagePending: patient.triagePending,
      firstContactAt: patient.firstContactAt ?? undefined,
      queueDestination: patient.queueDestination,
      arrival: patient.arrival,
      quickSafetyFlags: patient.quickSafetyFlags,
      highRiskComplaintFlags: patient.highRiskComplaintFlags,
    });
    this.patientRepository.save(entity).catch((error) => {
      this.logger.warn(`Failed to persist patient ${patient.id} to database: ${error}`);
    });
  }

  /**
   * Mirrors `persistPatientToDatabase()`: best-effort, non-blocking
   * write-through to the real `alerts` table. Called for every dispatched
   * alert (and once per fixture-seeded alert at construction) so real data
   * exists for a future read-cutover. Never throws.
   */
  private persistAlertToDatabase(alert: EmergencyAlert): void {
    if (!this.alertRepository) return;
    const entity = this.alertRepository.create({
      id: alert.id,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      patientId: alert.patientId,
      dispatchedAt: alert.createdAt,
      dismissed: alert.dismissed,
    });
    this.alertRepository.save(entity).catch((error) => {
      this.logger.warn(`Failed to persist alert ${alert.id} to database: ${error}`);
    });
  }

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

  getPatient(patientId: string): EmergencyPatient | undefined {
    return clone(this.patients.find((patient) => patient.id === patientId));
  }

  updatePatient(patientId: string, patch: Partial<EmergencyPatient>): EmergencyPatient {
    const index = this.patients.findIndex((patient) => patient.id === patientId);
    if (index === -1) throw new Error(`Emergency patient ${patientId} not found`);
    const current = this.patients[index];
    const normalizedPatch: Partial<EmergencyPatient> = { ...patch };
    if (patch.flags !== undefined) {
      normalizedPatch.flags = normalizePatientFlags(patch.flags);
    }
    if (patch.vitals !== undefined) {
      normalizedPatch.vitals = normalizePatientVitals(
        patch.vitals,
        patch.assignedStaffId || current.assignedStaffId || 'intake',
        new Date().toISOString(),
      );
    }
    this.patients[index] = {
      ...current,
      ...normalizedPatch,
      id: current.id,
    };
    const updated = clone(this.patients[index]);
    this.persistPatientToDatabase(updated);
    this.publishPatientBoardRealtime('patient_updated', updated, updated);
    this.projectCigBoard('patient.updated', `patient-updated-${updated.id}`);
    return updated;
  }

  createPatient(input: Partial<EmergencyPatient>): EmergencyPatient {
    // Idempotency guard: real frontend callers (receptionIntakeOrchestrator.ts,
    // QuickIntake.tsx, emergencyStore.ts's fire-and-forget backend sync) send the
    // client-generated id they already created locally, and the sync call is never
    // retried through this same id-checked path anywhere else in this service --
    // unlike updatePatient() above, this method used to push() unconditionally, so
    // a network retry of the exact same create request (timeout + browser/proxy
    // retry, or a duplicate dispatch of the store action) produced two identical-id
    // entries in this.patients, silently diverging the in-memory board from the
    // single row the DB-side upsert kept. Returning the existing record for a
    // repeated id makes a retry a no-op instead of a duplicate.
    if (input.id) {
      const existing = this.patients.find((patient) => patient.id === input.id);
      if (existing) {
        return clone(existing);
      }
    }
    const now = new Date().toISOString();
    const normalized = ensurePatientArrivalBlock(input);
    const state = normalized.state || 'Triage';
    const priority = normalized.priority || 'P3';
    const patient: EmergencyPatient = {
      // Spread every field the caller sent (normalized already carries the
      // full input through via its own spread in syncPatientFromArrival) so
      // fields with no defaulting/normalization need -- phone, mobilePhone,
      // healthCardNumber, healthCard, phn, source, location, symptoms,
      // waitTimeMinutes, lastAssessedTime, and any future Patient field --
      // survive creation instead of being silently dropped by an allowlist
      // that only a handful of fields ever made it onto.
      ...normalized,
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
      vitals: normalizePatientVitals(
        normalized.vitals,
        normalized.assignedStaffId || 'intake',
        now,
      ),
      flags: normalized.flags
        ? normalizePatientFlags(normalized.flags)
        : priority === 'P1' || priority === 'P2'
          ? ['HighRisk']
          : [],
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
    this.persistPatientToDatabase(created);
    this.publishPatientBoardRealtime('patient_created', created, created);
    this.projectCigBoard('patient.created', `patient-created-${created.id}`);
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
    this.persistPatientToDatabase(updated);
    this.publishPatientBoardRealtime(
      'journey_state_changed',
      {
        patient: updated,
        journeyEvent: event,
      },
      updated,
    );
    this.projectCigBoard('patient.state.changed', `patient-state-${updated.id}-${to}`);
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
    const updated = clone(this.patients[index]);
    this.persistPatientToDatabase(updated);
    return updated;
  }

  assignStaffToPatient(
    patientId: string,
    staffId: string,
    actorStaffId = 'workflow-orchestrator',
  ): EmergencyPatient {
    const index = this.patients.findIndex((patient) => patient.id === patientId);
    if (index === -1) throw new Error(`Emergency patient ${patientId} not found`);
    const patient = this.patients[index];
    this.patients[index] = {
      ...patient,
      assignedStaffId: staffId,
    };
    this.workflowLogService.record({
      type: 'staff_assigned',
      title: 'Staff assigned',
      summary: `Assigned staff ${staffId} to patient ${patient.firstName} ${patient.lastName}.`,
      patientId,
      actorStaffId,
      source: 'emergency-patient-service',
      metadata: { staffId },
    });
    const updated = clone(this.patients[index]);
    this.persistPatientToDatabase(updated);
    this.publishPatientBoardRealtime(
      'staff_assigned',
      { patientId, staffId, patient: updated },
      updated,
    );
    this.projectCigBoard('patient.assigned', `patient-assigned-${updated.id}-${staffId}`);
    return updated;
  }

  addPatientNote(
    patientId: string,
    text: string,
    authorId = 'workflow-orchestrator',
  ): EmergencyPatient {
    const index = this.patients.findIndex((patient) => patient.id === patientId);
    if (index === -1) throw new Error(`Emergency patient ${patientId} not found`);
    const patient = this.patients[index];
    const note = {
      id: createId('note'),
      text,
      authorId,
      timestamp: new Date().toISOString(),
    };
    this.patients[index] = {
      ...patient,
      notes: [...patient.notes, note],
    };
    this.workflowLogService.record({
      type: 'patient_note_added',
      title: 'Patient note added',
      summary: 'Administrative automation staged clinician-reviewed note.',
      patientId,
      actorStaffId: authorId,
      source: 'emergency-patient-service',
      metadata: { noteId: note.id },
    });
    const updated = clone(this.patients[index]);
    this.persistPatientToDatabase(updated);
    this.publishPatientBoardRealtime(
      'patient_note_added',
      { patientId, note, patient: updated },
      updated,
    );
    return updated;
  }

  dispatchOperationalAlert(input: {
    severity: EmergencyAlert['severity'];
    title: string;
    message: string;
    patientId?: string;
    source?: string;
    metadata?: Record<string, unknown>;
  }): EmergencyAlert {
    const alert: EmergencyAlert = {
      id: createId('alert'),
      severity: input.severity,
      title: input.title,
      message: input.message,
      patientId: input.patientId,
      createdAt: new Date().toISOString(),
      dismissed: false,
    };
    this.alerts.unshift(alert);
    this.persistAlertToDatabase(alert);
    this.workflowLogService.record({
      type: 'operational_alert_dispatched',
      title: input.title,
      summary: input.message,
      patientId: input.patientId,
      source: input.source || 'emergency-patient-service',
      severity: input.severity === 'Critical' ? 'Critical' : 'Warning',
      metadata: (input.metadata || {}) as Record<string, string | number | boolean | null>,
    });
    this.realtimeService?.publish({ type: 'alert_created', payload: alert });
    this.realtimeService?.publishBoardMutations();
    return clone(alert);
  }

  escalatePatient(patientId: string, actorStaffId: string): EmergencyPatient {
    const index = this.patients.findIndex((patient) => patient.id === patientId);
    if (index === -1) throw new Error(`Emergency patient ${patientId} not found`);
    const patient = this.patients[index];
    // 'Escalated' is not a recognized frontend PatientFlag (see src/types/
    // emergency.ts) -- it rendered no badge and drove no queue/reassessment
    // logic, silently diverging from the frontend's own local escalation
    // (buildEscalatePatientPatch), which adds these 3 real flags. Match the
    // frontend's canonical set so a reload doesn't drop real escalation
    // signal down to nothing recognizable.
    const ESCALATION_FLAGS = ['HighRisk', 'DeteriorationRisk', 'ReassessmentDue'];
    const flags = [...new Set([...patient.flags, ...ESCALATION_FLAGS])];
    this.patients[index] = {
      ...patient,
      flags,
    };
    this.dispatchOperationalAlert({
      severity: 'Critical',
      title: `Escalation — ${patient.firstName} ${patient.lastName}`,
      message: 'Administrative automation escalation recorded for clinician follow-up.',
      patientId,
      source: 'workflow-orchestrator',
      metadata: { actorStaffId },
    });
    this.workflowLogService.record({
      type: 'patient_escalated',
      title: 'Patient escalated',
      summary: `Escalated patient ${patient.firstName} ${patient.lastName}.`,
      patientId,
      actorStaffId,
      source: 'emergency-patient-service',
      severity: 'Critical',
    });
    const updated = clone(this.patients[index]);
    this.persistPatientToDatabase(updated);
    this.publishPatientBoardRealtime('patient_escalated', { patientId, patient: updated }, updated);
    return updated;
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
    // publishBoardMutations() -> getWhiteboard() -> computeCapacity() is a real
    // call cycle (the whiteboard envelope embeds the capacity snapshot), so
    // this guard must be settled BEFORE triggering any further realtime
    // side effect. Setting lastCapacityScore after the publishBoardMutations()
    // call left the "score changed" condition true for every reentrant call
    // in that cycle, causing genuine infinite recursion (self-terminating
    // only once V8's stack limit was hit) on every real capacity change --
    // confirmed live: a single patient state transition through the new
    // MB-P0-6/HEAL-089 PATCH route hung the backend for 20+ seconds of pure
    // recursive CPU burn, and repeated transitions could compound into a
    // full request-queue stall. See MB-P0-6 follow-up.
    const previousScore = this.lastCapacityScore;
    this.lastCapacityScore = score;
    if (previousScore !== undefined && previousScore !== score) {
      this.workflowLogService.record({
        type: 'capacity_score_changed',
        title: 'Capacity score changed',
        summary: `Capacity score changed from ${previousScore} to ${score}.`,
        source: 'capacity-service',
        severity: band === 'Red' ? 'Critical' : 'Warning',
        metadata: {
          fromScore: previousScore,
          toScore: score,
          band,
        },
      });
      this.realtimeService?.publish({ type: 'capacity_updated', payload: snapshot });
      this.realtimeService?.publishBoardMutations();
    }
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
export class EMSIntakeService implements OnModuleInit {
  private readonly logger = new Logger(EMSIntakeService.name);
  /** In-memory mirror of ems_arrival_status, kept synchronous like ReferralService's
   * createdReferrals so getEMSIntake() never needs to become async for its 7 real
   * callers -- rehydrated once at boot, updated on every write, persisted in the
   * background. */
  private readonly arrivalStatusById = new Map<string, Record<string, unknown>>();

  constructor(
    private readonly patientService: EmergencyPatientService,
    private readonly workflowLogService: WorkflowActionLogService,
    @Optional()
    @InjectRepository(EmsArrivalStatus)
    private readonly arrivalStatusRepository?: Repository<EmsArrivalStatus>,
    @Optional() private readonly realtimeService?: EmergencyRealtimeService,
  ) {}

  /**
   * Load durable EMS arrival status transitions so the offload clock (arrived /
   * handoff-started / handoff-completed) survives a process restart and stays
   * consistent across workstations, instead of living only in each browser's local
   * store (see emsOffloadTracker.ts's own documented gap on the frontend side).
   */
  async onModuleInit(): Promise<void> {
    if (!this.arrivalStatusRepository) return;
    try {
      const rows = await this.arrivalStatusRepository.find();
      for (const row of rows) {
        this.arrivalStatusById.set(row.id, this.mapEntityToStatusRecord(row));
      }
    } catch (error) {
      this.logger.warn(`Failed to rehydrate EMS arrival status from database: ${error}`);
    }
  }

  private mapEntityToStatusRecord(entity: EmsArrivalStatus): Record<string, unknown> {
    return {
      status: entity.status,
      patientId: entity.patientId,
      unitId: entity.unitId,
      unitName: entity.unitName,
      arrivedAt: entity.arrivedAt,
      handoffStartedAt: entity.handoffStartedAt,
      handoffCompletedAt: entity.handoffCompletedAt,
    };
  }

  private persistArrivalStatus(arrivalId: string, record: Record<string, unknown>): void {
    if (!this.arrivalStatusRepository) return;
    const entity = this.arrivalStatusRepository.create({
      id: arrivalId,
      status: String(record.status || ''),
      patientId: record.patientId ? String(record.patientId) : undefined,
      unitId: record.unitId ? String(record.unitId) : undefined,
      unitName: record.unitName ? String(record.unitName) : undefined,
      arrivedAt: record.arrivedAt ? String(record.arrivedAt) : undefined,
      handoffStartedAt: record.handoffStartedAt ? String(record.handoffStartedAt) : undefined,
      handoffCompletedAt: record.handoffCompletedAt ? String(record.handoffCompletedAt) : undefined,
    });
    this.arrivalStatusRepository.save(entity).catch((error) => {
      this.logger.warn(`Failed to persist EMS arrival status ${arrivalId} to database: ${error}`);
    });
  }

  /**
   * Upserts a durable status transition for one EMS arrival, keyed by the same
   * arrivalId the frontend already generates. Merges onto whatever's already tracked
   * rather than replacing it, so a later "handoff started" call doesn't erase an
   * earlier "arrived" timestamp -- mirrors how normalizeEmsArrivalOffloadPatch already
   * merges on the frontend.
   */
  updateArrivalStatus(
    arrivalId: string,
    patch: Record<string, unknown>,
  ): EmergencyModuleEnvelope<Record<string, unknown>> {
    const id = String(arrivalId || '').trim();
    if (!id) {
      return envelope('EMS Arrival Status', { ok: false, error: 'arrivalId is required' });
    }
    const existing = this.arrivalStatusById.get(id) || {};
    const merged: Record<string, unknown> = {
      ...existing,
      ...Object.fromEntries(Object.entries(patch).filter(([, value]) => value != null)),
    };
    if (!merged.status) merged.status = existing.status || 'Inbound';
    this.arrivalStatusById.set(id, merged);
    this.persistArrivalStatus(id, merged);
    // Was silent -- an arrival's Inbound/Arrived/handoff-started/handoff-
    // completed transition persisted correctly but never told another tab
    // or user anything changed (same gap shape as ReferralService before
    // HEAL-094). publishEmsUpdate() already exists and already builds the
    // correct full-envelope payload (getEMSIntake()'s own output) -- it was
    // just never called from the one place that actually mutates this
    // service's own state; only EmergencyPatientService called it, and only
    // when an EMS-flagged PATIENT record changed, not an EMS ARRIVAL record.
    this.realtimeService?.publishEmsUpdate();

    return envelope('EMS Arrival Status', { ok: true, arrivalId: id, ...merged });
  }

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
      .map((row, index) =>
        buildInboundEmsRecord(
          row,
          index,
          this.arrivalStatusById.get(`ems-arrival-${row.patient.id}`),
        ),
      );
    return envelope('EMS Intake', {
      arrivals,
      emsArrivals,
      incomingPatients: emsArrivals,
      availableResusRooms: this.patientService
        .listRooms()
        .filter((room) => room.type === 'Resus' && room.status === 'Available').length,
    });
  }

  /**
   * Persist EMS ambulance handoff completion (defect D2).
   * Mirrors reception→triage handoff: server-side workflow audit + optional patient note.
   * Local whiteboard status remains the frontend source of truth for unit tracking;
   * this endpoint makes completion survive refresh / multi-workstation use.
   */
  completeHandoff(input: {
    arrivalId?: string;
    patientId?: string;
    actorName?: string;
    unitId?: string;
    unitName?: string;
    chiefComplaint?: string;
    handoffAcceptedAt?: string;
    handoffStartedAt?: string;
    arrivedAt?: string;
    checklist?: Record<string, unknown>;
    notes?: string;
  }) {
    const arrivalId = String(input.arrivalId || '').trim();
    if (!arrivalId) {
      return envelope('EMS Handoff', { ok: false, error: 'arrivalId is required' });
    }

    const timestamp = input.handoffAcceptedAt || new Date().toISOString();
    const patientId = input.patientId ? String(input.patientId).trim() : '';
    const patient = patientId
      ? this.patientService.listPatients().find((entry) => entry.id === patientId)
      : undefined;

    if (patientId && patient) {
      this.workflowLogService.record({
        type: 'patient_note_added',
        title: 'EMS handoff note',
        summary: `EMS handoff completed for arrival ${arrivalId}${
          input.unitName ? ` (${input.unitName})` : ''
        }.`,
        patientId,
        actorName: input.actorName,
        source: 'ems-pipeline',
        metadata: {
          handoff: 'ems.handoff',
          arrivalId,
          unitId: input.unitId ?? null,
          unitName: input.unitName ?? null,
        },
      });
    }

    this.updateArrivalStatus(arrivalId, {
      status: 'Complete',
      patientId: patientId || undefined,
      unitId: input.unitId,
      unitName: input.unitName,
      arrivedAt: input.arrivedAt,
      handoffStartedAt: input.handoffStartedAt,
      handoffCompletedAt: timestamp,
    });

    const log = this.workflowLogService.record({
      type: patientId && patient ? 'ems_converted_to_patient' : 'journey_state_changed',
      title: 'EMS handoff completed',
      summary: `EMS arrival ${arrivalId} handoff completed${
        input.unitName ? ` by unit ${input.unitName}` : ''
      }${patientId ? ` → patient ${patientId}` : ''}.`,
      patientId: patientId || undefined,
      actorName: input.actorName,
      source: 'ems-pipeline',
      metadata: {
        handoff: 'ems.handoff',
        arrivalId,
        unitId: input.unitId || null,
        unitName: input.unitName || null,
        chiefComplaint: input.chiefComplaint || null,
        handoffAcceptedAt: timestamp,
        handoffStartedAt: input.handoffStartedAt || input.arrivedAt || timestamp,
        arrivedAt: input.arrivedAt || null,
        checklistJson: input.checklist ? JSON.stringify(input.checklist) : null,
        notes: input.notes || null,
        status: 'Complete',
      },
    });

    return envelope('EMS Handoff', {
      ok: true,
      arrivalId,
      patientId: patientId || null,
      status: 'Complete',
      handoffCompletedAt: timestamp,
      workflowLogId: log.id,
      patient: patient || null,
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
  trackedStatus?: Record<string, unknown>,
) {
  const { patient, etaMinutes, offloadRisk } = row;
  const estimatedArrivalTime = new Date(Date.now() + etaMinutes * 60000).toISOString();
  const latestVitals = patient.vitals?.[patient.vitals.length - 1];
  return {
    id: `ems-arrival-${patient.id || index}`,
    patientId: undefined,
    unitId: (trackedStatus?.unitId as string) || patient.mrn || `EMS-${index + 1}`,
    unitName: (trackedStatus?.unitName as string) || patient.mrn || `EMS Unit ${index + 1}`,
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
    // Durable status/timestamps win over the synthetic 'Inbound' default the moment
    // this arrival has any tracked transition (see EMSIntakeService.updateArrivalStatus) --
    // this is what makes the offload clock survive a reload / different workstation.
    status: (trackedStatus?.status as 'Inbound') || 'Inbound',
    arrivedAt: (trackedStatus?.arrivedAt as string) || undefined,
    handoffStartedAt: (trackedStatus?.handoffStartedAt as string) || undefined,
    handoffCompletedAt: (trackedStatus?.handoffCompletedAt as string) || undefined,
    priority: patient.priority,
    notes: patient.timeline?.[patient.timeline.length - 1]?.note || patient.chiefComplaint,
    mechanismOfInjury: patient.complaintCategory,
  };
}

/** Duplicate-check escape hatch: the client already ran its own gate and staff confirmed. */
export type SmartIntakeCreateInput = Partial<EmergencyPatient> & {
  confirmDuplicateOverride?: boolean;
};

@Injectable()
export class SmartIntakeService {
  constructor(
    private readonly patientService: EmergencyPatientService,
    private readonly workflowLogService: WorkflowActionLogService,
  ) {}

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

  /**
   * Server-side duplicate gate. Runs regardless of what the caller's own client
   * already checked — closes the gap where the primary create-patient path had no
   * check of its own (only the reception UI's client-side gate did). Blocks a
   * high-confidence match unless the caller explicitly confirms with
   * confirmDuplicateOverride; anything below that is logged but non-blocking.
   */
  private guardAgainstUnconfirmedDuplicate(
    input: SmartIntakeCreateInput,
  ): PatientDuplicateCandidate[] {
    const demographics = {
      firstName: input.firstName,
      lastName: input.lastName,
      dob: input.dob,
      sex: input.sex,
      mrn: input.mrn,
    };
    const candidates = findPatientDuplicateCandidates(
      this.patientService.listPatients(),
      demographics,
      {
        minScore: DUPLICATE_MANUAL_REVIEW_THRESHOLD,
        limit: 5,
      },
    );
    if (!candidates.length) return candidates;

    const top = candidates[0];
    const isHighConfidence = top.matchScore >= DUPLICATE_HIGH_CONFIDENCE_THRESHOLD;
    const displayName = `${input.firstName || 'Unknown'} ${input.lastName || 'Patient'}`.trim();

    if (isHighConfidence && !input.confirmDuplicateOverride) {
      this.workflowLogService.record({
        type: 'patient_duplicate_flagged',
        title: 'Duplicate patient creation blocked',
        summary: `Blocked create for ${displayName} — top match ${top.matchScore}% against existing patient ${top.patientId}.`,
        source: 'smart-intake-service',
        severity: 'Warning',
        metadata: {
          blocked: true,
          topMatchPatientId: top.patientId,
          topMatchScore: top.matchScore,
        },
      });
      throw new ConflictException({
        message:
          'Possible duplicate patient detected. Review the candidates and resubmit with confirmDuplicateOverride to proceed.',
        duplicateCandidates: candidates,
      });
    }

    this.workflowLogService.record({
      type: 'patient_duplicate_flagged',
      title: isHighConfidence
        ? 'Duplicate patient creation confirmed by caller'
        : 'Possible duplicate patient created',
      summary: `Created ${displayName} with ${candidates.length} candidate match(es); top ${top.matchScore}% against ${top.patientId}.`,
      source: 'smart-intake-service',
      severity: isHighConfidence ? 'Warning' : 'Info',
      metadata: {
        blocked: false,
        overrideConfirmed: Boolean(input.confirmDuplicateOverride),
        topMatchPatientId: top.patientId,
        topMatchScore: top.matchScore,
      },
    });
    return candidates;
  }

  createFromIntake(input: SmartIntakeCreateInput) {
    const duplicateCandidates = this.guardAgainstUnconfirmedDuplicate(input);
    const patient = this.patientService.createPatient(input);
    return envelope('Smart Intake', { patient, duplicateCandidates });
  }

  createVerticalSlice(input: SmartIntakeCreateInput & { staffId?: string }) {
    const duplicateCandidates = this.guardAgainstUnconfirmedDuplicate(input);
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
      duplicateCandidates,
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
    @Optional() private readonly realtimeService?: EmergencyRealtimeService,
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

  /**
   * Durable reception escalation for multi-station EDs: alert + workflow log + realtime fan-out.
   */
  raiseEscalation(input: {
    reasonId?: string;
    reasonLabel?: string;
    patientId?: string;
    detail?: string;
    actorName?: string;
    actorStaffId?: string;
    severity?: 'Info' | 'Warning' | 'Critical';
    notifyTargets?: Array<'triage' | 'charge'>;
  }) {
    const reasonId = String(input.reasonId || 'urgent-triage-attention').trim();
    const reasonLabel = String(input.reasonLabel || reasonId).trim();
    const severity = input.severity || 'Critical';
    const notifyTargets = input.notifyTargets?.length
      ? input.notifyTargets
      : (['triage', 'charge'] as Array<'triage' | 'charge'>);
    const notifyRoles = notifyTargets.map((target) =>
      target === 'triage' ? 'triage_nurse' : 'charge_nurse',
    );
    const patientId = input.patientId ? String(input.patientId).trim() : undefined;
    const patient = patientId ? this.patientService.getPatient(patientId) : undefined;
    const patientLabel = patient
      ? `${patient.firstName} ${patient.lastName}`.trim()
      : patientId || 'No patient linked';
    const actorName = input.actorName || 'Reception';
    const detail = input.detail?.trim();
    const message = [
      `Flagged by ${actorName}`,
      patientLabel,
      detail,
      `Notify: ${notifyTargets.map((t) => (t === 'triage' ? 'Triage nurse' : 'Charge nurse')).join(' · ')}`,
    ]
      .filter(Boolean)
      .join(' · ');

    const alert = this.patientService.dispatchOperationalAlert({
      severity,
      title: `Reception escalation — ${reasonLabel}`,
      message,
      patientId,
      source: 'reception-escalation-workflow',
      metadata: {
        receptionEscalationReason: reasonId,
        receptionEscalationTargets: notifyTargets.join(','),
        notifyRoles: notifyRoles.join(','),
        actorName,
        detail: detail || null,
      },
    });

    // Explicit realtime event for clinical workstations (beyond generic alert_created).
    this.realtimeService?.publish({
      type: 'reception_escalation',
      payload: {
        alertId: alert.id,
        patientId,
        reasonId,
        reasonLabel,
        severity,
        notifyTargets,
        notifyRoles,
        actorName,
        detail,
        timestamp: alert.createdAt,
        message,
      },
    });

    this.workflowLogService.record({
      type: 'patient_escalated',
      title: 'Reception escalation',
      summary: message,
      patientId,
      actorName,
      actorStaffId: input.actorStaffId,
      source: 'reception-workspace',
      severity: severity === 'Critical' ? 'Critical' : 'Warning',
      metadata: {
        reasonId,
        notifyTargets: notifyTargets.join(','),
        alertId: alert.id,
      },
    });

    if (patientId && patient) {
      try {
        const flags = patient.flags || [];
        if (!flags.includes('Escalated')) {
          this.patientService.updatePatient(patientId, {
            flags: [...flags, 'Escalated'],
          } as any);
        }
      } catch {
        // patient may not exist on board yet
      }
    }

    return envelope('Reception Escalation', {
      ok: true,
      alert,
      record: {
        id: `reception-esc-${alert.id}`,
        alertId: alert.id,
        reasonId,
        reasonLabel,
        patientId,
        patientLabel,
        detail,
        actorName,
        actorStaffId: input.actorStaffId,
        timestamp: alert.createdAt,
        notifyTargets,
      },
    });
  }
}

/**
 * KNOWN DUPLICATE, NOT YET RECONCILED (found 2026-08-12, repo-wide export-collision audit):
 * `backend/src/services/reassessment.service.ts` independently backs its own `ReassessmentModule`
 * (registered in AppModule alongside this one) with its own Mongoose-backed `ReassessmentService`
 * against a different `UnifiedPatient` model. This TypeORM-backed one (routed under
 * `EmergencyOsController`, `GET /emergency/reassessment`) is the one the real frontend consumes
 * (confirmed via ReassessmentEngine.ts / the reassessment-due UI). Same duplication pattern as
 * BoardingService/CapacityService below and the already-documented Smart Intake TypeORM/Mongoose
 * split (patient-onboarding-consolidation audit, HEAL-121-125) -- a larger legacy-stack question
 * than one round can resolve; see docs/architecture/CARE_DROID_MASTER_BACKLOG.md.
 */
@Injectable()
export class ReassessmentService {
  private readonly logger = new Logger(ReassessmentService.name);

  constructor(
    private readonly patientService: EmergencyPatientService,
    @Optional() private readonly emailService?: EmailService,
  ) {}

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

  /**
   * Real out-of-band notification for the waiting-room-safety escalation transition
   * (src/services/alertLifecycleOrchestrator.ts's real, live 3-minute auto-escalation --
   * NOT the Mongoose reassessment.scheduler.ts cron, which never runs by default since
   * it only starts inside registerEmergencyMongooseRuntime(), gated behind
   * ENABLE_MONGOOSE_EMERGENCY_OS=false). Extends the already-real in-app escalation past
   * the browser tab via email to the same INCIDENT_ESCALATION_EMAILS distribution list
   * incident-reporting.service.ts already reads but never actually sends to -- reuses
   * the existing, parsed config rather than inventing a new env var.
   */
  async notifyWaitingRoomEscalation(input: {
    patientId?: string;
    alertId?: string;
    title: string;
    message: string;
  }): Promise<EmergencyModuleEnvelope<Record<string, unknown>>> {
    const recipients = getEnvironmentConfig().notifications.incidentEscalationEmails;
    if (!recipients.length) {
      this.logger.warn(
        'No INCIDENT_ESCALATION_EMAILS configured -- waiting-room escalation notification not sent.',
      );
      return envelope('Waiting Room Escalation Notification', {
        ok: true,
        sent: false,
        recipientCount: 0,
      });
    }
    if (!this.emailService) {
      return envelope('Waiting Room Escalation Notification', {
        ok: true,
        sent: false,
        recipientCount: recipients.length,
      });
    }

    const html = `<p>${input.message}</p>${
      input.patientId ? `<p>Patient: ${input.patientId}</p>` : ''
    }`;
    const results = await Promise.all(
      recipients.map((to) =>
        this.emailService!.sendEmail({ to, subject: `[CareDroid] ${input.title}`, html }).catch(
          (error) => {
            this.logger.warn(`Failed to send escalation email to ${to}: ${error}`);
            return false;
          },
        ),
      ),
    );
    const sentCount = results.filter(Boolean).length;

    return envelope('Waiting Room Escalation Notification', {
      ok: true,
      sent: sentCount > 0,
      recipientCount: recipients.length,
      sentCount,
      alertId: input.alertId,
      patientId: input.patientId,
    });
  }
}

/**
 * This TypeORM-backed service (routed under `EmergencyOsController`, `GET /emergency/capacity`)
 * is the one the real frontend/whiteboard consumes. A Mongoose-backed duplicate
 * (`backend/src/services/capacity.service.ts`, its own `CapacityModule`, `GET
 * /emergency/capacity/dashboard`) was found flagged as a naming collision on 2026-08-12 and
 * removed on 2026-08-12 (HEAL-138): it required MongoDB (never configured in any deployment this
 * repo defines -- see docs/architecture/CARE_DROID_MASTER_BACKLOG.md), its frontend capability
 * flag was already explicitly DISABLED, and its one real caller had already been repointed to
 * this endpoint on 2026-08-09. Same naming-collision pattern still open for ReassessmentService
 * above and BoardingService below -- those two have real, non-dead sub-routes beyond the summary
 * GET, so were left as documented duplicates rather than removed; see the master backlog.
 */
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

/**
 * KNOWN DUPLICATE, NOT YET RECONCILED (found 2026-08-12, repo-wide export-collision audit):
 * `backend/src/services/boarding.service.ts` independently backs its own `BoardingModule`
 * (registered in AppModule alongside this one) -- Mongoose-backed against a different
 * `UnifiedPatient` model, different boarding thresholds (158/240/360/480 min vs. this file's own),
 * and a self-documented gap (`notifyBedManagement` has zero subscribers per that file's own
 * comment). This TypeORM-backed one (routed under `EmergencyOsController`,
 * `GET /emergency/boarding`) is the one the real frontend consumes (boardingSignals.ts). Same
 * pattern as ReassessmentService/CapacityService above; see
 * docs/architecture/CARE_DROID_MASTER_BACKLOG.md for the full finding.
 */
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
export class ReferralService implements OnModuleInit {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    private readonly patientService: EmergencyPatientService,
    @Optional()
    @InjectRepository(ReferralEntity)
    private readonly referralRepository?: Repository<ReferralEntity>,
    @Optional() private readonly realtimeService?: EmergencyRealtimeService,
  ) {}

  private readonly createdReferrals: Array<Record<string, unknown>> = [];

  /** Load durable referrals from TypeORM so a created referral survives process restart. */
  async onModuleInit(): Promise<void> {
    if (!this.referralRepository) return;
    try {
      const rows = await this.referralRepository.find();
      for (const row of rows) {
        if (this.createdReferrals.some((existing) => existing.id === row.id)) continue;
        this.createdReferrals.push(this.mapEntityToReferral(row));
      }
    } catch (error) {
      this.logger.warn(`Failed to rehydrate referrals from database: ${error}`);
    }
  }

  private mapEntityToReferral(entity: ReferralEntity): Record<string, unknown> {
    // Re-derived fresh from the live patient list rather than stored on the entity --
    // a persisted snapshot would go stale the moment the patient's own record changes
    // (state, flags, etc.), the same reasoning getReferrals()'s synthetic rows already
    // use for patient-derived referrals.
    const patient = this.patientService
      .listPatients()
      .find((candidate) => candidate.id === entity.patientId);
    return {
      id: entity.id,
      patientId: entity.patientId,
      patient,
      requestingStaffId: entity.requestingStaffId,
      targetDepartment: entity.targetDepartment,
      specialty: entity.specialty,
      urgency: entity.urgency,
      reason: entity.reason,
      clinicalSummary: entity.clinicalSummary,
      status: entity.status,
      workflow: entity.workflow,
      requestedAt: entity.requestedAt,
      statusUpdatedAt: entity.statusUpdatedAt,
      createdAt: entity.requestedAt,
    };
  }

  private persistReferralToDatabase(referral: Record<string, unknown>): void {
    if (!this.referralRepository) return;
    const entity = this.referralRepository.create({
      id: String(referral.id),
      patientId: String(referral.patientId || ''),
      requestingStaffId: String(referral.requestingStaffId || ''),
      targetDepartment: String(referral.targetDepartment || ''),
      specialty: String(referral.specialty || ''),
      urgency: String(referral.urgency || ''),
      reason: String(referral.reason || ''),
      clinicalSummary: String(referral.clinicalSummary || ''),
      status: String(referral.status || ''),
      workflow: String(referral.workflow || ''),
      requestedAt: String(referral.requestedAt || ''),
      statusUpdatedAt: referral.statusUpdatedAt ? String(referral.statusUpdatedAt) : undefined,
    });
    this.referralRepository.save(entity).catch((error) => {
      this.logger.warn(`Failed to persist referral ${entity.id} to database: ${error}`);
    });
  }

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
    this.persistReferralToDatabase(referral);
    // ReferralService had no realtime wiring at all before this -- neither
    // creation nor status changes ever reached another tab/user, only
    // whichever tab made the call (and only via that tab's own
    // self-dispatched local event, not a real backend broadcast). Matches
    // the same event-type vocabulary the frontend's local-only
    // createReferral action already uses for its workflow-log entry.
    this.realtimeService?.publish({ type: 'referral_created', payload: { referral } });
    this.realtimeService?.publishBoardMutations();

    return envelope('Referral Created', {
      referral,
      referrals: this.getReferrals().data.referrals,
    });
  }

  /** Backs PATCH /emergency/transfers/:id/status -- only real, created
   * referrals (this.createdReferrals) can be updated; the synthetic
   * patient-derived rows in getReferrals() aren't real records to mutate. */
  updateReferralStatus(referralId: string, status: string) {
    const referral = this.createdReferrals.find((entry) => entry.id === referralId);
    if (!referral) {
      throw new NotFoundException(`Referral ${referralId} not found`);
    }
    referral.status = status;
    referral.statusUpdatedAt = new Date().toISOString();
    this.persistReferralToDatabase(referral);
    this.realtimeService?.publish({ type: 'referral_status_changed', payload: { referral } });
    this.realtimeService?.publishBoardMutations();

    return envelope('Referral Status Updated', {
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

  /**
   * Removed 2026-08-08: this method was a keyword if/else matcher with zero
   * LLM invocation -- chest-pain/sepsis/stroke guidance was hardcoded canned
   * text presented as if reasoned. A repository-wide call-graph trace found
   * both of its HTTP callers (EmergencyOsController.queryCopilot(),
   * EdCopilotNestParityController.query()) had zero real frontend consumers,
   * and both now delegate to ChatService.processMessage() -- the same
   * canonical orchestration pipeline the live copilot chat UI uses -- instead
   * of this fake-AI runtime. Its one piece of real, non-obvious logic (a
   * priority/DPS-change safety-floor check) was ported to
   * ChatService.handleEdCopilotPriorityChange() in chat.service.ts so the
   * live copilot chat path gets the same safety floor this unreachable
   * method already had. See AI_ORCHESTRATION_AUDIT.md.
   */
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
export class EmergencySettingsService implements OnModuleInit {
  private readonly logger = new Logger(EmergencySettingsService.name);
  private readonly defaultSettings = clone(DEFAULT_EMERGENCY_OS_SETTINGS);
  private readonly byOrganization = new Map<string, EmergencyOsSettingsContract>();

  constructor(
    @Optional()
    @InjectRepository(EmergencyOsSettingsEntity)
    private readonly settingsRepository?: Repository<EmergencyOsSettingsEntity>,
    @Optional() private readonly realtimeService?: EmergencyRealtimeService,
  ) {}

  /**
   * Load durable settings overrides from TypeORM so a hospital's tuned
   * thresholds (reassessment intervals, capacity warnings, EMS offload
   * targets, etc.) survive a process restart instead of silently reverting
   * to hardcoded defaults -- previously this service was in-memory only.
   */
  async onModuleInit(): Promise<void> {
    if (!this.settingsRepository) return;
    try {
      const rows = await this.settingsRepository.find();
      for (const row of rows) {
        try {
          const persisted = JSON.parse(row.settingsJson) as Partial<EmergencyOsSettingsContract>;
          this.byOrganization.set(
            row.organizationId,
            mergeSettings(this.defaultSettings, persisted),
          );
        } catch (parseError) {
          this.logger.warn(
            `Failed to parse persisted settings for organization ${row.organizationId}: ${parseError}`,
          );
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to rehydrate settings from database: ${error}`);
    }
  }

  private persistSettingsToDatabase(key: string, settings: EmergencyOsSettingsContract): void {
    if (!this.settingsRepository) return;
    const entity = this.settingsRepository.create({
      organizationId: key,
      settingsJson: JSON.stringify(settings),
    });
    this.settingsRepository.save(entity).catch((error) => {
      this.logger.warn(`Failed to persist settings for organization ${key} to database: ${error}`);
    });
  }

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
    this.persistSettingsToDatabase(key, merged);
    const result = this.getSettings(organizationId);
    // Was silent -- a threshold change (reassessment intervals, capacity
    // warning bands, EMS offload targets, etc.) persisted correctly but
    // every OTHER logged-in user kept computing against their own stale
    // in-memory settings until their next full reload. The frontend
    // already had a correct 'settings_updated' handler (dispatchWebSocketEvent
    // -> saveEmergencySettings) waiting for exactly this envelope shape --
    // it just never received anything, since this service never broadcast
    // at all (same gap shape as ReferralService/EMSIntakeService before
    // HEAL-094/095).
    this.realtimeService?.publish({ type: 'settings_updated', payload: result });
    this.realtimeService?.publishBoardMutations();
    return result;
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
