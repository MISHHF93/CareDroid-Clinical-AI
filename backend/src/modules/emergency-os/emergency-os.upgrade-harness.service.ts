import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import { HUMAN_REVIEW_DISCLAIMER } from '../../../../lib/ai/safetyPolicy';
import { EmergencyPatientService, WorkflowActionLogService } from './emergency-os.services';
import type {
  AdvancedEmergencyOsUpgradeHarness,
  CapacityBand,
  EmergencyModuleEnvelope,
  EmergencyPatient,
  EmergencyVitals,
  UpgradeHarnessAuditMetadata,
  UpgradeHarnessCapability,
  UpgradeHarnessProvenance,
  UpgradeHarnessSafety,
  UpgradeHarnessSignal,
} from './emergency-os.types';

const SAFETY_POLICY_VERSION = 'emergency-os-upgrade-harness-safety-v1';
const BLOCKED_AUTONOMOUS_ACTIONS = [
  'autonomous diagnosis',
  'autonomous prescribing',
  'autonomous disposition',
  'autonomous patient matching',
];
const PILOT_GAPS = [
  'Azure, Hyperledger, Zoom/WebRTC, BLE, and cloud-provider integrations are deterministic provider abstractions only.',
  'Signals are pilot decision support and require local clinical, operational, privacy, and model-governance validation.',
  'No autonomous diagnosis, prescribing, disposition, or patient matching is enabled by this harness.',
];

type BragBand = 'Blue' | 'Red' | 'Amber' | 'Green';

function envelope<T>(
  module: string,
  data: T,
  remainingGaps: string[] = PILOT_GAPS,
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function round(value: number, precision = 0): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function minutesSince(timestamp: string): number {
  const ms = new Date(timestamp).getTime();
  if (!Number.isFinite(ms)) return 0;
  return Math.max(0, Math.round((Date.now() - ms) / 60000));
}

function patientName(patient: EmergencyPatient): string {
  return `${patient.firstName} ${patient.lastName}`.trim() || patient.mrn;
}

function latestVitals(patient: EmergencyPatient): Partial<EmergencyVitals> {
  if (Array.isArray(patient.vitals)) return patient.vitals.at(-1) || {};
  return {};
}

function vitalNumber(vitals: Partial<EmergencyVitals>, key: keyof EmergencyVitals): number | null {
  const value = vitals[key];
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

function stableHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function bragBand(capacityBand: CapacityBand, forecastScore: number): BragBand {
  if (capacityBand === 'Red' || forecastScore >= 90) return 'Red';
  if (capacityBand === 'Orange' || forecastScore >= 76) return 'Amber';
  if (capacityBand === 'Yellow' || forecastScore >= 58) return 'Green';
  return 'Blue';
}

@Injectable()
export class EmergencyOsUpgradeHarnessService {
  constructor(
    private readonly patientService: EmergencyPatientService,
    private readonly workflowLogService: WorkflowActionLogService,
  ) {}

  // HEAL-347.91: every signal-builder below traces back to activePatients(),
  // which called EmergencyPatientService.listPatients() with no organizationId
  // at all -- every one of this harness's 5 endpoints returned every org's real
  // patient roster (unit assignments, high-risk flags, capacity/forecast bands
  // derived from cross-tenant patient counts) to any authenticated caller with
  // READ_PHI. Found while auditing the same gap class in the
  // /emergency/realtime SSE stream and the sibling PatientFlowService.
  getHarness(
    organizationId?: string,
  ): EmergencyModuleEnvelope<AdvancedEmergencyOsUpgradeHarness> {
    const generatedAt = new Date().toISOString();
    const capacityAndForecasting = this.buildCapacityAndForecastingSignals(
      generatedAt,
      organizationId,
    );
    const patientFlow = this.buildPatientFlowSignals(generatedAt, undefined, organizationId);
    const clinicalDecisionSupport = this.buildClinicalDecisionSupportSignals(
      generatedAt,
      undefined,
      organizationId,
    );
    const governance = this.buildGovernanceSignals(generatedAt, [
      ...capacityAndForecasting,
      ...patientFlow,
      ...clinicalDecisionSupport,
    ]);

    this.recordHarnessAudit('aggregate', 'Advanced upgrade harness aggregate generated.');

    return envelope('Advanced CareDroid Upgrade Harness', {
      harnessId: 'advanced-emergency-os-upgrade-harness',
      mode: 'deterministic-pilot-harness',
      apiBase: '/api/emergency',
      generatedAt,
      safetyNotice: HUMAN_REVIEW_DISCLAIMER,
      blockedAutonomousActions: BLOCKED_AUTONOMOUS_ACTIONS,
      capacityAndForecasting,
      patientFlow,
      clinicalDecisionSupport,
      governance,
      pilotReadiness: {
        totalCapabilities: 10,
        reviewRequired: 10,
        externalDependenciesConnected: false,
        canonicalEndpoints: [
          '/api/emergency/upgrade-harness',
          '/api/emergency/upgrade-harness/capacity',
          '/api/emergency/upgrade-harness/patient-flow',
          '/api/emergency/upgrade-harness/clinical-intelligence',
          '/api/emergency/upgrade-harness/audit-summary',
        ],
      },
    });
  }

  getCapacityAndForecasting(organizationId?: string) {
    const generatedAt = new Date().toISOString();
    this.recordHarnessAudit('capacity', 'Capacity and 10-hour forecasting harness generated.');
    return envelope('Advanced CareDroid Capacity Upgrade Harness', {
      signals: this.buildCapacityAndForecastingSignals(generatedAt, organizationId),
    });
  }

  getPatientFlow(patientId?: string, organizationId?: string) {
    const generatedAt = new Date().toISOString();
    this.recordHarnessAudit('patient-flow', 'Patient flow upgrade harness generated.', patientId);
    return envelope('Advanced CareDroid Patient Flow Upgrade Harness', {
      patientId: patientId || null,
      signals: this.buildPatientFlowSignals(generatedAt, patientId, organizationId),
    });
  }

  getClinicalDecisionSupport(patientId?: string, organizationId?: string) {
    const generatedAt = new Date().toISOString();
    this.recordHarnessAudit(
      'clinical-intelligence',
      'Clinical intelligence upgrade harness generated.',
      patientId,
    );
    return envelope('Advanced CareDroid Clinical Intelligence Upgrade Harness', {
      patientId: patientId || null,
      signals: this.buildClinicalDecisionSupportSignals(generatedAt, patientId, organizationId),
    });
  }

  getAuditSummary(organizationId?: string) {
    const generatedAt = new Date().toISOString();
    const signals = [
      ...this.buildCapacityAndForecastingSignals(generatedAt, organizationId),
      ...this.buildPatientFlowSignals(generatedAt, undefined, organizationId),
      ...this.buildClinicalDecisionSupportSignals(generatedAt, undefined, organizationId),
    ];
    this.recordHarnessAudit('audit-summary', 'Immutable audit abstraction summary generated.');
    return envelope('Advanced CareDroid Upgrade Audit Summary', {
      signals: this.buildGovernanceSignals(generatedAt, signals),
      workflowLogs: this.workflowLogService.listLogs().slice(0, 10),
    });
  }

  private buildCapacityAndForecastingSignals(
    generatedAt: string,
    organizationId?: string,
  ): Array<UpgradeHarnessSignal<Record<string, unknown>>> {
    const patients = this.activePatients(organizationId);
    const capacity = this.patientService.computeCapacity();
    const waiting = patients.filter((patient) => patient.state === 'Waiting').length;
    const highRisk = patients.filter(isHighRisk).length;
    const boarders = patients.filter(isBoarding).length;
    const arrivalsPerHour = Math.max(4, round(patients.length / 2, 1));
    const pressure = clamp(
      capacity.score + waiting * 2 + highRisk * 3 + boarders * 4 + capacity.reassessmentDue * 2,
      0,
      100,
    );

    const adaptivePolicy = this.signal(
      'real_time_simulation_adaptive_policy',
      'Real-time simulation and adaptive policy evaluation',
      generatedAt,
      0.78,
      {
        liveState: {
          census: patients.length,
          waiting,
          highRisk,
          boarders,
          reassessmentDue: capacity.reassessmentDue,
          capacityScore: capacity.score,
          capacityBand: capacity.band,
        },
        adaptivePolicies: [
          {
            policyId: 'split-flow-triage-pilot',
            trigger: 'waiting > 4 or capacity score > 70',
            expectedImpact: 'Reduce waiting-room backlog by 2-4 patients over 120 minutes.',
            activationMode: 'charge-nurse-review-only',
          },
          {
            policyId: 'boarding-huddle-pilot',
            trigger: 'boarders >= 2 or capacity band Orange/Red',
            expectedImpact: 'Prioritize accepted admissions and discharge-ready handoffs.',
            activationMode: 'operations-lead-review-only',
          },
          {
            policyId: 'regional-diversion-checkpoint-pilot',
            trigger: 'capacity band Red and EMS pressure high',
            expectedImpact:
              'Prompt regional policy review without changing destination automatically.',
            activationMode: 'regional-human-review-only',
          },
        ],
        currentPressureScore: pressure,
        recommendedPolicyReview:
          pressure >= 85
            ? 'Review regional diversion checkpoint and boarding huddle now.'
            : pressure >= 70
              ? 'Review split-flow triage and boarding huddle.'
              : 'Continue standard command-center monitoring.',
      },
      ['EmergencyPatientService fixtures', 'CapacitySnapshot', 'queue counts', 'boarding flags'],
      [
        'No live ADT stream, staffing roster API, EMS dispatch feed, or regional policy engine connected.',
      ],
    );

    const forecast = [0, 2, 4, 6, 8, 10].map((hour) => {
      const inflow = arrivalsPerHour * hour;
      const throughput = Math.max(1, (patients.length - waiting + 3) * 0.18 * hour);
      const boarderDrag = boarders * hour * 1.4;
      const reassessmentDrag = capacity.reassessmentDue * hour * 0.8;
      const forecastScore = clamp(
        capacity.score + inflow * 1.5 - throughput + boarderDrag + reassessmentDrag,
        0,
        100,
      );
      return {
        hour,
        projectedCapacityScore: round(forecastScore),
        projectedCensus: round(clamp(patients.length + inflow - throughput, 0, 220), 1),
        projectedWaiting: round(clamp(waiting + inflow * 0.38 - throughput * 0.28, 0, 160), 1),
        brag: bragBand(capacity.band, forecastScore),
        humanReviewTrigger:
          forecastScore >= 90
            ? 'Red BRAG: command-center and regional policy review required.'
            : forecastScore >= 76
              ? 'Amber BRAG: charge nurse review required.'
              : 'Routine human monitoring.',
      };
    });

    const bragForecast = this.signal(
      'brag_forecast_10h',
      '10-hour BRAG operational forecast',
      generatedAt,
      0.74,
      {
        horizonHours: 10,
        forecast,
        peakBand: forecast.some((point) => point.brag === 'Red')
          ? 'Red'
          : forecast.some((point) => point.brag === 'Amber')
            ? 'Amber'
            : forecast.some((point) => point.brag === 'Green')
              ? 'Green'
              : 'Blue',
        recommendation:
          'Use as a command-center review prompt only; do not initiate staffing, diversion, or disposition without accountable human approval.',
      },
      ['CapacitySnapshot', 'patient state counts', 'fixture arrival-rate heuristic'],
      [
        'No validated local demand model, weather/event feed, or hospital bed-management integration connected.',
      ],
    );

    return [adaptivePolicy, bragForecast];
  }

  private buildPatientFlowSignals(
    generatedAt: string,
    patientId?: string,
    organizationId?: string,
  ): Array<UpgradeHarnessSignal<Record<string, unknown>>> {
    const patients = this.patientsFor(patientId, organizationId);
    const activePatients = this.activePatients(organizationId);
    const modularUnits = ['cardiac', 'respiratory', 'mental-health', 'infection', 'fast-track'].map(
      (unit) => {
        const assigned = activePatients.filter((patient) => this.pathologyUnit(patient) === unit);
        return {
          unit,
          label: `${unit.replace(/-/g, ' ')} mixed-pathology module`,
          patientIds: assigned.map((patient) => patient.id),
          load: assigned.length,
          staffedMode: assigned.some(isHighRisk) ? 'senior-review-required' : 'standard-review',
        };
      },
    );

    const modularSignal = this.signal(
      'modular_mixed_pathology_units',
      'Modular mixed-pathology unit harness',
      generatedAt,
      0.8,
      {
        units: modularUnits,
        selectedPatientIds: patients.map((patient) => patient.id),
        routingPolicy:
          'Groups patients into review queues by complaint and flags without assigning clinicians or rooms automatically.',
      },
      ['chief complaint text', 'complaint category', 'patient flags'],
      ['No staffing optimizer, bed allocator, or patient-matching engine connected.'],
    );

    const vvtCandidates = patients
      .filter(
        (patient) =>
          patient.priority === 'P4' ||
          patient.priority === 'P5' ||
          (/medication|note|follow.?up|minor|rash|sore throat/i.test(patient.chiefComplaint) &&
            !isHighRisk(patient)),
      )
      .map((patient) => ({
        patientId: patient.id,
        patientLabel: patientName(patient),
        track: 'virtual-visit-review',
        reason: `${patient.priority} ${patient.chiefComplaint}`,
        safetyGate: 'RN/MD must confirm suitability before virtual handoff.',
      }));

    const vvtSignal = this.signal(
      'virtual_visit_track',
      'Virtual visit track harness',
      generatedAt,
      0.7,
      {
        candidates: vvtCandidates,
        providerContract: 'telehealth-provider-adapter-placeholder',
        workflow:
          'Creates review-only virtual-visit candidates; no Zoom/WebRTC room, appointment, or disposition is created.',
      },
      ['priority', 'chief complaint', 'risk flags'],
      [
        'No telehealth credential, video room, consent capture, or scheduling integration connected.',
      ],
    );

    const splitFlowSignal = this.signal(
      'nurse_led_split_flow',
      'Nurse-led split-flow harness',
      generatedAt,
      0.77,
      {
        lanes: [
          {
            lane: 'resus-and-high-acuity',
            patientIds: activePatients.filter(isHighRisk).map((patient) => patient.id),
            lead: 'charge-rn-md-review',
          },
          {
            lane: 'rapid-assessment-zone',
            patientIds: activePatients
              .filter((patient) => ['P3', 'P4'].includes(patient.priority) && !isHighRisk(patient))
              .map((patient) => patient.id),
            lead: 'nurse-led-protocol-review',
          },
          {
            lane: 'low-acuity-fast-track',
            patientIds: activePatients
              .filter((patient) => patient.priority === 'P5')
              .map((patient) => patient.id),
            lead: 'rn-provider-review',
          },
        ],
        protocolMessage:
          'Nurse-led lanes are operational suggestions only and do not change scope of practice, orders, or disposition.',
      },
      ['priority', 'state', 'flags'],
      ['No live staffing scope rules, credentialing, or order-set execution connected.'],
    );

    const wearableAlerts = patients
      .map((patient) => {
        const vitals = latestVitals(patient);
        const spo2 = vitalNumber(vitals, 'spo2');
        const hr = vitalNumber(vitals, 'hr');
        const temp = vitalNumber(vitals, 'temp');
        const alerts = [
          spo2 !== null && spo2 < 94 ? `SpO2 ${spo2}` : null,
          hr !== null && (hr < 50 || hr > 120) ? `HR ${hr}` : null,
          temp !== null && temp >= 38.5 ? `Temp ${temp}` : null,
        ].filter(Boolean);
        return alerts.length
          ? {
              patientId: patient.id,
              patientLabel: patientName(patient),
              wearableAlertId: `iomt-${patient.id}`,
              signals: alerts,
              status: 'human-review-required',
            }
          : null;
      })
      .filter(Boolean);

    const wearableSignal = this.signal(
      'wearable_iomt_processing',
      'Wearable IoMT processing harness',
      generatedAt,
      0.73,
      {
        alerts: wearableAlerts,
        providerContract: 'deterministic-iomt-provider-no-ble',
        processingMode: 'fixture-vitals-replay',
      },
      ['latest vitals', 'patient flags'],
      ['No BLE gateway, bedside monitor feed, RPM cloud, or device identity binding connected.'],
    );

    return [modularSignal, vvtSignal, splitFlowSignal, wearableSignal];
  }

  private buildClinicalDecisionSupportSignals(
    generatedAt: string,
    patientId?: string,
    organizationId?: string,
  ): Array<UpgradeHarnessSignal<Record<string, unknown>>> {
    const patients = this.patientsFor(patientId, organizationId);
    const activePatients = this.activePatients(organizationId);
    const highRiskPatients = patients.filter(isHighRisk);

    const cdssSignal = this.signal(
      'multimodal_cdss',
      'Multimodal CDSS with safety gates',
      generatedAt,
      0.76,
      {
        reviewQueue: highRiskPatients.map((patient) => {
          const vitals = latestVitals(patient);
          return {
            patientId: patient.id,
            patientLabel: patientName(patient),
            multimodalSignals: {
              chiefComplaint: patient.chiefComplaint,
              complaintCategory: patient.complaintCategory,
              vitals,
              flags: patient.flags,
              waitMinutes: minutesSince(patient.arrivalTime),
            },
            decisionSupport:
              'Review deterioration risk, reassessment timing, and applicable local checklist.',
            blockedClinicalClaims:
              'No diagnosis, medication, order, disposition, or patient matching is generated.',
          };
        }),
        safetyGate: 'All CDSS cards require accountable clinician review before action.',
      },
      ['chief complaint', 'vitals', 'flags', 'wait time'],
      [
        'No validated model weights, image/audio ingestion, medication allergy feed, or EHR order context connected.',
      ],
    );

    const federatedSignal = this.signal(
      'federated_learning_harness',
      'Federated learning pilot harness',
      generatedAt,
      0.68,
      {
        modelCard: {
          modelId: 'ed-flow-risk-federated-v1-pilot',
          round: 0,
          localSampleCount: activePatients.length,
          metrics: {
            auc: 0.74,
            calibration: 0.91,
            sensitivity: 0.72,
            specificity: 0.69,
          },
        },
        privacyContract:
          'No PHI leaves this service; secure aggregation and differential privacy are placeholder contracts.',
        insight:
          'Federated signal can rank operational risk themes for review, but cannot alter triage or disposition.',
      },
      ['aggregate patient counts', 'capacity snapshot', 'fixture model card'],
      [
        'No secure aggregation service, model registry, hospital registry, or privacy budget ledger connected.',
      ],
    );

    const telephoneCandidates = activePatients
      .filter(
        (patient) =>
          (patient.priority === 'P4' || patient.priority === 'P5') &&
          patient.state === 'Waiting' &&
          !isHighRisk(patient),
      )
      .slice(0, 5)
      .map((patient) => ({
        patientId: patient.id,
        patientLabel: patientName(patient),
        diversionPath: 'telephone-triage-review',
        reason: `${patient.priority} waiting ${minutesSince(patient.arrivalTime)}m`,
        reviewMessage:
          'Telephone triage can only suggest clinician-reviewed advice; it cannot discharge or redirect autonomously.',
      }));

    const telephoneSignal = this.signal(
      'telephone_triage_diversion',
      'Telephone triage diversion harness',
      generatedAt,
      0.69,
      {
        candidates: telephoneCandidates,
        callScript:
          'Structured symptom confirmation, red-flag screen, and escalation back to ED clinician review.',
        diversionStatus: 'recommendation-blocked-pending-human-approval',
      },
      ['priority', 'state', 'wait time', 'flags'],
      [
        'No telephony provider, nurse call queue, consent capture, or regional diversion protocol integration connected.',
      ],
    );

    return [cdssSignal, federatedSignal, telephoneSignal];
  }

  private buildGovernanceSignals(
    generatedAt: string,
    sourceSignals: Array<UpgradeHarnessSignal<Record<string, unknown>>>,
  ): Array<UpgradeHarnessSignal<Record<string, unknown>>> {
    const ledgerEntries = sourceSignals.map((signal, index) => ({
      index,
      eventId: signal.audit.eventId,
      capability: signal.capability,
      hash: signal.audit.immutableLedgerHash,
      previousHash: signal.audit.previousHash,
      reviewRequired: signal.audit.reviewRequired,
    }));

    return [
      this.signal(
        'immutable_audit_abstraction',
        'Blockchain-style immutable audit abstraction',
        generatedAt,
        0.81,
        {
          ledgerMode: 'sha256-linked-pilot-ledger',
          providerContract: 'hyperledger-adapter-placeholder',
          ledgerEntries,
          latestHash: ledgerEntries.at(-1)?.hash || stableHash('empty-ledger'),
          auditSummary:
            'Each upgrade signal carries a linked hash and workflow log context; no external blockchain node is used.',
        },
        ['upgrade signal payloads', 'workflow action logs'],
        [
          'No Hyperledger network, key management service, or external notarization endpoint connected.',
        ],
      ),
    ];
  }

  private signal<TData extends Record<string, unknown>>(
    capability: UpgradeHarnessCapability,
    label: string,
    generatedAt: string,
    confidence: number,
    data: TData,
    inputSignals: string[],
    limitations: string[],
  ): UpgradeHarnessSignal<TData> {
    const id = `upgrade-${capability}`;
    const provenance: UpgradeHarnessProvenance = {
      generatedBy: 'EmergencyOsUpgradeHarnessService',
      provider: `deterministic-${capability}-provider`,
      sourceSystems: ['EmergencyPatientService', 'CapacitySnapshot', 'WorkflowActionLogService'],
      inputSignals,
      evidenceWindow: 'current in-memory CareDroid fixture state',
      limitations,
    };
    const safety: UpgradeHarnessSafety = {
      status: 'review_required',
      humanReviewMessage: `${HUMAN_REVIEW_DISCLAIMER} This ${label} output is pilot decision support only and cannot trigger diagnosis, prescribing, disposition, or patient matching.`,
      policyVersion: SAFETY_POLICY_VERSION,
      autonomousActionsBlocked: BLOCKED_AUTONOMOUS_ACTIONS,
    };
    const audit = this.auditFor(capability, generatedAt, data);

    return {
      id,
      capability,
      label,
      confidence: clamp(round(confidence, 2), 0, 1),
      provenance,
      safety,
      audit,
      data,
    };
  }

  private auditFor(
    capability: UpgradeHarnessCapability,
    generatedAt: string,
    data: Record<string, unknown>,
  ): UpgradeHarnessAuditMetadata {
    const previousHash = stableHash(`${capability}:pilot-genesis`);
    const immutableLedgerHash = stableHash({
      capability,
      data,
      previousHash,
      policyVersion: SAFETY_POLICY_VERSION,
    });

    return {
      eventId: `audit-${capability}`,
      generatedAt,
      actor: 'system-pilot-harness',
      source: 'emergency-os-upgrade-harness',
      immutableLedgerHash,
      previousHash,
      retentionLabel: 'pilot-audit-review',
      reviewRequired: true,
    };
  }

  private patientsFor(patientId?: string, organizationId?: string): EmergencyPatient[] {
    const patients = this.activePatients(organizationId);
    if (!patientId) return patients;
    return patients.filter((patient) => patient.id === patientId);
  }

  private activePatients(organizationId?: string): EmergencyPatient[] {
    return this.patientService
      .listPatients(organizationId)
      .filter((patient) => patient.state !== 'Discharge');
  }

  private pathologyUnit(patient: EmergencyPatient): string {
    const text = `${patient.complaintCategory} ${patient.chiefComplaint} ${patient.flags.join(' ')}`;
    if (/chest|cardiac|heart|stroke|neuro/i.test(text)) return 'cardiac';
    if (/resp|asthma|copd|shortness|oxygen|spo2/i.test(text)) return 'respiratory';
    if (/psych|mental|suicid|behavior/i.test(text)) return 'mental-health';
    if (/fever|sepsis|infection|isolation/i.test(text)) return 'infection';
    return 'fast-track';
  }

  private recordHarnessAudit(scope: string, summary: string, patientId?: string) {
    this.workflowLogService.record({
      type: 'upgrade_harness_used',
      title: 'Upgrade harness used',
      summary,
      patientId,
      source: 'emergency-os-upgrade-harness',
      metadata: {
        scope,
        safetyPolicyVersion: SAFETY_POLICY_VERSION,
        reviewRequired: true,
        autonomousActionsBlocked: BLOCKED_AUTONOMOUS_ACTIONS.join(', '),
      },
    });
  }
}
