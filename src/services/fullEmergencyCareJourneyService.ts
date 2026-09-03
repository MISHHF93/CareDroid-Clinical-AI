import {
  Priority,
  PatientState,
  type Alert,
  type CapacitySnapshot,
  type EMSArrival,
  type Patient,
  type Staff,
} from '../types/emergency';
import { getDispatchSummary } from './dispatchIntakeService';
import { getActiveTraces, getJourneyMetrics, type JourneyStage } from './emergencySignalService';
import { getReadinessSummary } from './edReadinessService';
import { getPreArrivalDashboard } from './emsPreArrivalPipelineService';
import { buildBottleneckRegistrySnapshot } from './bottleneckRegistry';
import { getCADSystemSummary } from './cadIntegrationService';
import { getPrehospitalSummary } from './prehospitalAssessmentService';
import { getStaffRoutingSummary } from './staffRoutingService';
import { getDiagnosticsSummary } from './diagnosticsCoordinationService';
import { CANONICAL_ROUTES } from '../config/routes.config';

export type EmergencyJourneyStageId =
  | 'emergency-event'
  | 'emergency-call'
  | 'dispatcher-triage'
  | 'ambulance-dispatch'
  | 'ems-en-route'
  | 'ems-arrival-scene'
  | 'prehospital-care'
  | 'hospital-pre-arrival'
  | 'ed-readiness'
  | 'patient-arrival'
  | 'rapid-intake'
  | 'triage'
  | 'ai-chief-review'
  | 'clinical-action'
  | 'diagnostics'
  | 'treatment-observation'
  | 'disposition'
  | 'handoff-reporting'
  | 'outcome-tracking'
  | 'analytics-feedback';

export type EmergencyJourneyStage = Readonly<{
  id: EmergencyJourneyStageId;
  order: number;
  label: string;
  ownerRoles: readonly string[];
  serviceModules: readonly string[];
  route: string;
  outcome: string;
  safety: string;
}>;

export type ServiceJourneyModule = Readonly<{
  id: string;
  label: string;
  stageIds: readonly EmergencyJourneyStageId[];
  reuseStatus: 'existing' | 'extended' | 'new-runtime-map';
  implementation: string;
  connectedRoutes: readonly string[];
}>;

const SAFETY_LINE =
  'Decision support only; licensed staff retain responsibility for clinical, dispatch, EMS, and operational decisions.';

export const FULL_EMERGENCY_CARE_JOURNEY: readonly EmergencyJourneyStage[] = Object.freeze([
  {
    id: 'emergency-event',
    order: 1,
    label: 'Emergency Event',
    ownerRoles: ['caller', 'bystander', 'facility staff'],
    serviceModules: ['EmergencySignalService'],
    route: '/emergency/dispatch',
    outcome: 'Emergency signal captured with source, location, and immediate risk.',
    safety: SAFETY_LINE,
  },
  {
    id: 'emergency-call',
    order: 2,
    label: 'Emergency Call / 911 Contact',
    ownerRoles: ['dispatcher'],
    serviceModules: ['DispatchIntakeService', 'EmergencySignalService'],
    route: '/emergency/dispatch',
    outcome: 'Caller, location, complaint, callback, hazards, and life-risk indicators recorded.',
    safety: SAFETY_LINE,
  },
  {
    id: 'dispatcher-triage',
    order: 3,
    label: 'Dispatcher Triage',
    ownerRoles: ['dispatcher'],
    serviceModules: ['DispatchIntakeService', 'AIChiefService'],
    route: '/emergency/dispatch',
    outcome: 'Priority, protocol, pre-arrival instructions, and response needs documented.',
    safety: SAFETY_LINE,
  },
  {
    id: 'ambulance-dispatch',
    order: 4,
    label: 'Ambulance Dispatch',
    ownerRoles: ['dispatcher', 'EMS coordinator'],
    serviceModules: ['CADIntegrationService', 'EMSUnitService', 'StaffRoutingService'],
    route: '/emergency/ems',
    outcome: 'EMS unit assigned with ETA, crew, status, and special instructions.',
    safety: SAFETY_LINE,
  },
  {
    id: 'ems-en-route',
    order: 5,
    label: 'EMS En Route',
    ownerRoles: ['paramedic', 'EMS coordinator'],
    serviceModules: ['EMSUnitService', 'EmergencySignalService'],
    route: '/emergency/ems',
    outcome: 'Crew sees call summary, suspected condition, location, and hazards.',
    safety: SAFETY_LINE,
  },
  {
    id: 'ems-arrival-scene',
    order: 6,
    label: 'EMS Arrival and Scene Assessment',
    ownerRoles: ['paramedic'],
    serviceModules: ['PrehospitalAssessmentService', 'EMSUnitService'],
    route: '/emergency/ems',
    outcome: 'Scene safety, ABCs, vitals, medications, allergies, history, and red flags captured.',
    safety: SAFETY_LINE,
  },
  {
    id: 'prehospital-care',
    order: 7,
    label: 'Prehospital Care',
    ownerRoles: ['paramedic'],
    serviceModules: ['PrehospitalAssessmentService', 'ThreeMinuteResponseService'],
    route: '/emergency/ems',
    outcome: 'Interventions, severity updates, and transport decision recorded.',
    safety: SAFETY_LINE,
  },
  {
    id: 'hospital-pre-arrival',
    order: 8,
    label: 'Hospital Pre-Arrival Notification',
    ownerRoles: ['EMS coordinator', 'charge nurse'],
    serviceModules: ['PreArrivalNotificationService', 'AIChiefService', 'CriticalAlertService'],
    route: '/emergency/ems',
    outcome: 'MIST/SBAR packet received and ED team alerted before arrival.',
    safety: SAFETY_LINE,
  },
  {
    id: 'ed-readiness',
    order: 9,
    label: 'ED Readiness',
    ownerRoles: ['charge nurse', 'patient flow coordinator'],
    serviceModules: ['EDReadinessService', 'DepartmentCapacityService', 'StaffRoutingService'],
    route: '/emergency/ed-readiness',
    outcome: 'Bed, staff, equipment, specialty, lab, radiology, and pharmacy preparation tracked.',
    safety: SAFETY_LINE,
  },
  {
    id: 'patient-arrival',
    order: 10,
    label: 'Patient Arrival',
    ownerRoles: ['registration clerk', 'triage nurse', 'paramedic'],
    serviceModules: ['PatientIntakeService', 'EMSUnitService'],
    route: '/emergency/reception',
    outcome: 'Ambulance, walk-in, transfer, referral, or self-arrival enters ED workflow.',
    safety: SAFETY_LINE,
  },
  {
    id: 'rapid-intake',
    order: 11,
    label: 'Rapid Intake',
    ownerRoles: ['registration clerk', 'triage nurse'],
    serviceModules: ['PatientIntakeService', 'EmergencySignalService'],
    route: CANONICAL_ROUTES.emergencyReception,
    outcome: 'Minimum life-critical demographics, complaint, identity, and safety flags captured.',
    safety: SAFETY_LINE,
  },
  {
    id: 'triage',
    order: 12,
    label: 'Triage',
    ownerRoles: ['triage nurse'],
    serviceModules: ['TriageService', 'ThreeMinuteResponseService'],
    route: '/emergency/reception?queue=pretriage',
    outcome:
      'ESI-style five-level acuity support, vitals, red flags, and clinician override recorded.',
    safety: 'ESI-style support is advisory only; triage nurse confirms acuity.',
  },
  {
    id: 'ai-chief-review',
    order: 13,
    label: 'AI Chief Review',
    ownerRoles: ['triage nurse', 'charge nurse', 'emergency physician'],
    serviceModules: ['AIChiefService', 'BottleneckRegistryService'],
    route: '/emergency/copilot',
    outcome:
      'Risk, missing data, routing, next action, and escalation summarized for human review.',
    safety: SAFETY_LINE,
  },
  {
    id: 'clinical-action',
    order: 14,
    label: 'Clinical Action',
    ownerRoles: ['registered nurse', 'emergency physician'],
    serviceModules: ['StaffRoutingService', 'CriticalAlertService'],
    route: '/emergency/whiteboard',
    outcome: 'Nurse or physician accepts, modifies, dismisses, or acts on recommendations.',
    safety: SAFETY_LINE,
  },
  {
    id: 'diagnostics',
    order: 15,
    label: 'Diagnostics',
    ownerRoles: ['physician', 'lab technician', 'radiology technician', 'pharmacist'],
    serviceModules: ['DiagnosticsCoordinationService'],
    route: '/emergency/diagnostics',
    outcome: 'Labs, imaging, ECG, medication review, and consult workflows coordinated.',
    safety: SAFETY_LINE,
  },
  {
    id: 'treatment-observation',
    order: 16,
    label: 'Treatment / Observation',
    ownerRoles: ['registered nurse', 'emergency physician'],
    serviceModules: ['TriageService', 'CriticalAlertService', 'DepartmentCapacityService'],
    route: '/emergency/whiteboard',
    outcome: 'Care plan, monitoring, reassessment, interventions, and observation state tracked.',
    safety: SAFETY_LINE,
  },
  {
    id: 'disposition',
    order: 17,
    label: 'Disposition',
    ownerRoles: ['emergency physician', 'specialist', 'patient flow coordinator'],
    serviceModules: ['HandoffService', 'DepartmentCapacityService'],
    route: '/emergency/referrals',
    outcome:
      'Discharge, admit, transfer, observation, ICU, OR, or specialty care decision recorded.',
    safety: SAFETY_LINE,
  },
  {
    id: 'handoff-reporting',
    order: 18,
    label: 'Handoff / Reporting',
    ownerRoles: ['registered nurse', 'paramedic', 'specialist'],
    serviceModules: ['HandoffService', 'ReportingService'],
    route: '/emergency/handoffs',
    outcome: 'Structured EMS, ED, department, inpatient, or discharge handoff generated.',
    safety: SAFETY_LINE,
  },
  {
    id: 'outcome-tracking',
    order: 19,
    label: 'Outcome Tracking',
    ownerRoles: ['quality safety officer', 'hospital administrator'],
    serviceModules: ['AnalyticsService', 'ReportingService'],
    route: '/emergency/reports',
    outcome: 'Response, triage, treatment, delay, bottleneck, and flow outcomes tracked.',
    safety: SAFETY_LINE,
  },
  {
    id: 'analytics-feedback',
    order: 20,
    label: 'Analytics Feedback',
    ownerRoles: ['hospital administrator', 'IT administrator', 'quality safety officer'],
    serviceModules: ['AnalyticsService', 'BottleneckRegistryService', 'HelpManualService'],
    route: '/emergency/analytics',
    outcome:
      'Operational data improves staffing, routing, bottleneck detection, and 3-minute compliance.',
    safety: SAFETY_LINE,
  },
]);

export const SAAS_SERVICE_JOURNEY_MODULES: readonly ServiceJourneyModule[] = Object.freeze([
  {
    id: 'EmergencySignalService',
    label: 'Emergency Signal Service',
    stageIds: ['emergency-event', 'emergency-call', 'rapid-intake'],
    reuseStatus: 'existing',
    implementation: 'src/services/emergencySignalService.ts',
    connectedRoutes: ['/emergency/dispatch', '/emergency/patients'],
  },
  {
    id: 'DispatchIntakeService',
    label: 'Dispatch Intake Service',
    stageIds: ['emergency-call', 'dispatcher-triage'],
    reuseStatus: 'existing',
    implementation: 'src/services/dispatchIntakeService.ts',
    connectedRoutes: ['/emergency/dispatch'],
  },
  {
    id: 'CADIntegrationService',
    label: 'CAD Integration Service',
    stageIds: ['ambulance-dispatch'],
    reuseStatus: 'existing',
    implementation:
      'src/services/cadIntegrationService.ts — unit registry, dispatch assignment, status tracking',
    connectedRoutes: ['/emergency/dispatch', '/emergency/ems'],
  },
  {
    id: 'EMSUnitService',
    label: 'EMS Unit Service',
    stageIds: ['ambulance-dispatch', 'ems-en-route', 'patient-arrival'],
    reuseStatus: 'extended',
    implementation:
      'src/store/emergencyStore.ts EMS units plus src/services/emsPreArrivalPipelineService.ts',
    connectedRoutes: ['/emergency/ems'],
  },
  {
    id: 'PrehospitalAssessmentService',
    label: 'Prehospital Assessment Service',
    stageIds: ['ems-arrival-scene', 'prehospital-care'],
    reuseStatus: 'existing',
    implementation:
      'src/services/prehospitalAssessmentService.ts — vitals, interventions, medications, packet transmission',
    connectedRoutes: ['/emergency/ems'],
  },
  {
    id: 'PreArrivalNotificationService',
    label: 'Pre-Arrival Notification Service',
    stageIds: ['hospital-pre-arrival'],
    reuseStatus: 'existing',
    implementation: 'src/services/preArrivalNotification.ts',
    connectedRoutes: ['/emergency/ems', '/emergency/ed-readiness'],
  },
  {
    id: 'EDReadinessService',
    label: 'ED Readiness Service',
    stageIds: ['ed-readiness'],
    reuseStatus: 'existing',
    implementation: 'src/services/edReadinessService.ts',
    connectedRoutes: ['/emergency/ed-readiness', '/emergency/capacity'],
  },
  {
    id: 'PatientIntakeService',
    label: 'Patient Intake Service',
    stageIds: ['patient-arrival', 'rapid-intake'],
    reuseStatus: 'extended',
    implementation: 'src/services/emergencyIntakeOperatingSystemService.ts and ReceptionWorkspace',
    connectedRoutes: [CANONICAL_ROUTES.emergencyReception],
  },
  {
    id: 'TriageService',
    label: 'Triage Service',
    stageIds: ['triage', 'treatment-observation'],
    reuseStatus: 'extended',
    implementation: 'src/services/triageAssist.ts and src/engine/triageEngine.ts',
    connectedRoutes: ['/emergency/reception', '/emergency/queues'],
  },
  {
    id: 'AIChiefService',
    label: 'AI Chief Service',
    stageIds: ['dispatcher-triage', 'hospital-pre-arrival', 'ai-chief-review'],
    reuseStatus: 'extended',
    implementation: 'src/services/careDroidBrainService.ts, src/hooks/useAiChiefRouting.ts',
    connectedRoutes: ['/emergency/copilot'],
  },
  {
    id: 'CriticalAlertService',
    label: 'Critical Alert Service',
    stageIds: ['hospital-pre-arrival', 'clinical-action', 'treatment-observation'],
    reuseStatus: 'extended',
    implementation: 'src/engine/alertEngine.ts and src/services/clinicalAlertsApi.ts',
    connectedRoutes: ['/emergency/alerts', '/emergency/whiteboard'],
  },
  {
    id: 'ThreeMinuteResponseService',
    label: 'Three-Minute Response Service',
    stageIds: ['prehospital-care', 'triage'],
    reuseStatus: 'existing',
    implementation: 'src/engine/threeMinuteTimerEngine.ts mounted in src/app/providers.tsx',
    connectedRoutes: ['/emergency/alerts', '/emergency/whiteboard'],
  },
  {
    id: 'StaffRoutingService',
    label: 'Staff Routing Service',
    stageIds: ['ambulance-dispatch', 'ed-readiness', 'clinical-action'],
    reuseStatus: 'existing',
    implementation:
      'src/services/staffRoutingService.ts — routing rules, assignment tracking, workload awareness',
    connectedRoutes: ['/staff', '/emergency/whiteboard'],
  },
  {
    id: 'DepartmentCapacityService',
    label: 'Department Capacity Service',
    stageIds: ['ed-readiness', 'treatment-observation', 'disposition'],
    reuseStatus: 'existing',
    implementation:
      'src/services/emergencyCapacityIntelligenceService.ts and src/engine/capacityEngine.ts',
    connectedRoutes: ['/emergency/capacity', '/departments'],
  },
  {
    id: 'DiagnosticsCoordinationService',
    label: 'Diagnostics Coordination Service',
    stageIds: ['diagnostics'],
    reuseStatus: 'existing',
    implementation:
      'src/services/diagnosticsCoordinationService.ts — orders, status, results, STAT escalation',
    connectedRoutes: ['/emergency/diagnostics', '/lab', '/radiology', '/pharmacy'],
  },
  {
    id: 'HandoffService',
    label: 'Handoff Service',
    stageIds: ['disposition', 'handoff-reporting'],
    reuseStatus: 'extended',
    implementation:
      'src/services/ambulanceHandoffChecklist.ts, src/services/handoffClose.ts, shift summary',
    connectedRoutes: ['/emergency/handoffs', '/emergency/shift'],
  },
  {
    id: 'BottleneckRegistryService',
    label: 'Bottleneck Registry Service',
    stageIds: ['ai-chief-review', 'analytics-feedback'],
    reuseStatus: 'existing',
    implementation: 'src/services/bottleneckRegistry.ts',
    connectedRoutes: ['/emergency/analytics', '/emergency/copilot'],
  },
  {
    id: 'AnalyticsService',
    label: 'Analytics Service',
    stageIds: ['outcome-tracking', 'analytics-feedback'],
    reuseStatus: 'existing',
    implementation: 'src/services/analyticsService.ts and src/services/emergencyAnalyticsApi.ts',
    connectedRoutes: ['/emergency/analytics', '/emergency/reports'],
  },
  {
    id: 'ReportingService',
    label: 'Reporting Service',
    stageIds: ['handoff-reporting', 'outcome-tracking'],
    reuseStatus: 'extended',
    implementation: 'EmergencyAnalytics route and report view over the same operational data.',
    connectedRoutes: ['/emergency/reports'],
  },
  {
    id: 'HelpManualService',
    label: 'Help Manual Service',
    stageIds: ['analytics-feedback'],
    reuseStatus: 'existing',
    implementation: 'src/config/userManual.config.ts and src/components/help/HelpHub.tsx',
    connectedRoutes: ['/emergency/help'],
  },
]);

function minutesSince(value?: string): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? Math.max(0, Math.round((Date.now() - time) / 60000)) : 0;
}

const JOURNEY_STAGE_SIGNALS: Partial<Record<EmergencyJourneyStageId, readonly JourneyStage[]>> =
  Object.freeze({
    'emergency-event': ['emergency_event', 'call_received'],
    'emergency-call': ['call_received'],
    'dispatcher-triage': ['dispatcher_triage'],
    'ambulance-dispatch': ['ems_dispatched'],
    'ems-en-route': ['ems_en_route'],
    'ems-arrival-scene': ['ems_on_scene', 'prehospital_assessment'],
    'prehospital-care': ['prehospital_assessment', 'ems_transporting'],
    'hospital-pre-arrival': ['hospital_pre_notification', 'ed_readiness_activated'],
    'ed-readiness': ['ed_readiness_activated'],
    'patient-arrival': ['patient_arrival'],
    'rapid-intake': ['rapid_intake'],
    triage: ['triage_assigned'],
    'ai-chief-review': ['ai_chief_reviewed'],
    'clinical-action': ['clinical_action', 'treatment_in_progress'],
    diagnostics: ['diagnostics_ordered'],
    'treatment-observation': ['treatment_in_progress'],
    disposition: ['disposition_decided'],
    'handoff-reporting': ['handoff_complete'],
    'outcome-tracking': ['outcome_recorded'],
    'analytics-feedback': ['analytics_fed'],
  });

function traceTouchesStage(
  trace: { currentStage: JourneyStage; signals: { stage: JourneyStage }[] },
  stageId: EmergencyJourneyStageId,
) {
  const targets = JOURNEY_STAGE_SIGNALS[stageId];
  if (!targets?.length) return false;
  return (
    targets.includes(trace.currentStage) ||
    trace.signals.some((signal) => targets.includes(signal.stage))
  );
}

function stageStatus(
  stage: EmergencyJourneyStage,
  context: {
    patients: Patient[];
    emsArrivals: EMSArrival[];
    alerts: Alert[];
    capacity?: CapacitySnapshot;
  },
  traces: ReturnType<typeof getActiveTraces>,
) {
  const traceActive = traces.some((trace) => traceTouchesStage(trace, stage.id));
  if (traceActive) return 'active';

  if (stage.id === 'hospital-pre-arrival') return context.emsArrivals.length ? 'active' : 'ready';
  if (stage.id === 'triage')
    return context.patients.some((patient) => patient.state === PatientState.Triage)
      ? 'active'
      : 'ready';
  if (stage.id === 'clinical-action')
    return context.alerts.some((alert) => alert.severity === 'Critical' && !alert.acknowledged)
      ? 'attention'
      : 'ready';
  if (stage.id === 'ed-readiness') return context.capacity?.band === 'Red' ? 'attention' : 'ready';
  if (stage.id === 'disposition')
    return context.patients.some(
      (patient) =>
        patient.state === PatientState.Disposition || patient.state === PatientState.Admission,
    )
      ? 'active'
      : 'ready';
  if (stage.id === 'ambulance-dispatch' || stage.id === 'ems-en-route') {
    return context.emsArrivals.some((arrival) => arrival.status === 'Inbound') ? 'active' : 'ready';
  }
  return 'ready';
}

function storeArrivalsToPreArrivalPatients(emsArrivals: EMSArrival[]) {
  return emsArrivals.map((arrival) =>
    Object.freeze({
      id: arrival.id,
      patientLabel: arrival.unitName,
      unit: arrival.unitName,
      etaMinutes: arrival.eta,
      complaint: arrival.chiefComplaint,
      vitals: {},
      riskScoreBundle: [],
      riskIndicators: arrival.severity === 'Critical' ? ['critical-inbound'] : [],
      riskLevel: arrival.severity === 'Critical' ? 'critical' : 'high',
      handoffSummary: arrival.notes,
      notificationStatus: arrival.preArrivalNotification ? 'sent' : 'pending',
      journeyState: 'ems-prearrival',
      handoffStatus: arrival.status === 'Inbound' ? 'En Route' : 'Arrived',
    }),
  );
}

export function buildFullEmergencyCareJourneySnapshot(
  context: {
    patients?: Patient[];
    staff?: Staff[];
    emsArrivals?: EMSArrival[];
    alerts?: Alert[];
    capacity?: CapacitySnapshot;
  } = {},
) {
  const patients = context.patients ?? [];
  const emsArrivals = context.emsArrivals ?? [];
  const alerts = context.alerts ?? [];
  const activePatients = patients.filter((patient) => patient.state !== PatientState.Discharge);
  const criticalAlerts = alerts.filter(
    (alert) => alert.severity === 'Critical' && !alert.dismissed,
  );
  const activeTraces = getActiveTraces();
  const preArrival = getPreArrivalDashboard(
    emsArrivals.length ? storeArrivalsToPreArrivalPatients(emsArrivals) : undefined,
  );
  const dispatch = getDispatchSummary();
  const readiness = getReadinessSummary();
  const journeyMetrics = getJourneyMetrics();
  const cad = getCADSystemSummary();
  const prehospital = getPrehospitalSummary();
  const staffRouting = getStaffRoutingSummary();
  const diagnostics = getDiagnosticsSummary();
  const bottlenecks = buildBottleneckRegistrySnapshot({
    existingServiceSignals: {
      emergencyOperatingSystem: {
        dispatch,
        preArrival,
        readiness,
        journeyMetrics,
        capacity: context.capacity,
      },
    },
  });

  return Object.freeze({
    generatedAt: new Date().toISOString(),
    mission: 'CareDroid is the AI Chief of Staff for emergency response and hospital operations.',
    principle: "It takes 3 minutes to save someone's life.",
    safety: SAFETY_LINE,
    stages: FULL_EMERGENCY_CARE_JOURNEY.map((stage) =>
      Object.freeze({
        ...stage,
        status: stageStatus(
          stage,
          { patients, emsArrivals, alerts, capacity: context.capacity },
          activeTraces,
        ),
      }),
    ),
    services: SAAS_SERVICE_JOURNEY_MODULES,
    metrics: Object.freeze({
      activePatients: activePatients.length,
      p1p2Patients: activePatients.filter(
        (patient) => patient.priority === Priority.P1 || patient.priority === Priority.P2,
      ).length,
      inboundEms: emsArrivals.filter((arrival) => arrival.status === 'Inbound').length,
      criticalAlerts: criticalAlerts.length,
      unacknowledgedCriticalAlerts: criticalAlerts.filter((alert) => !alert.acknowledged).length,
      capacityBand: context.capacity?.band ?? 'Unknown',
      longestActiveJourneyMinutes: activePatients.reduce(
        (max, patient) => Math.max(max, minutesSince(patient.arrivalTime)),
        0,
      ),
      activeJourneyTraces: journeyMetrics.activeJourneys,
      threeMinuteBreaches: journeyMetrics.breachCount,
    }),
    activeTraces: activeTraces.map((trace) =>
      Object.freeze({
        traceId: trace.traceId,
        callId: trace.callId,
        patientId: trace.patientId,
        emsArrivalId: trace.emsArrivalId,
        currentStage: trace.currentStage,
        signalCount: trace.signals.length,
        threeMinuteBreachOccurred: trace.threeMinuteBreachOccurred,
        startedAt: trace.startedAt,
        lastUpdatedAt: trace.lastUpdatedAt,
      }),
    ),
    liveServiceSummaries: Object.freeze({
      dispatch,
      cad,
      prehospital,
      preArrival,
      readiness,
      journeyMetrics,
      staffRouting,
      diagnostics,
      bottlenecks,
    }),
  });
}

export function getServiceJourneyModule(id: string): ServiceJourneyModule | undefined {
  return SAAS_SERVICE_JOURNEY_MODULES.find((service) => service.id === id);
}

export default {
  buildFullEmergencyCareJourneySnapshot,
  stages: FULL_EMERGENCY_CARE_JOURNEY,
  services: SAAS_SERVICE_JOURNEY_MODULES,
};
