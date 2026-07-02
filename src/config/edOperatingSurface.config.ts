import { CANONICAL_ROUTES } from './routes.config';
import { getEmergencySurface } from './emergencyPipelineModel';
import type { EmergencyJourneyStageId } from '../services/fullEmergencyCareJourneyService';

export type EdJourneyPhaseId =
  | 'pre-arrival'
  | 'arrival-intake'
  | 'triage-assessment'
  | 'diagnostics-treatment'
  | 'disposition-handoff'
  | 'reporting-analytics';

export type EdOperatingPriority = 'P0' | 'P1' | 'P2' | 'P3';

export type EdOperatingSurfaceDefinition = Readonly<{
  surfaceId: string;
  label: string;
  phaseId: EdJourneyPhaseId;
  journeyStageIds: readonly EmergencyJourneyStageId[];
  ownerRole: string;
  priority: EdOperatingPriority;
  primaryDecision: string;
  defaultNextAction: string;
  threeMinuteRelevant: boolean;
}>;

export const ED_JOURNEY_PHASES: readonly Readonly<{
  id: EdJourneyPhaseId;
  order: number;
  label: string;
  stageIds: readonly EmergencyJourneyStageId[];
  route: string;
}>[] = Object.freeze([
  {
    id: 'pre-arrival',
    order: 1,
    label: 'Pre-Arrival',
    stageIds: [
      'emergency-event',
      'emergency-call',
      'dispatcher-triage',
      'ambulance-dispatch',
      'ems-en-route',
      'ems-arrival-scene',
      'prehospital-care',
      'hospital-pre-arrival',
      'ed-readiness',
    ],
    route: CANONICAL_ROUTES.emergencyDispatch,
  },
  {
    id: 'arrival-intake',
    order: 2,
    label: 'Arrival & Intake',
    stageIds: ['patient-arrival', 'rapid-intake'],
    route: CANONICAL_ROUTES.emergencyReception,
  },
  {
    id: 'triage-assessment',
    order: 3,
    label: 'Triage & Assessment',
    stageIds: ['triage', 'ai-chief-review', 'clinical-action'],
    route: CANONICAL_ROUTES.emergencyQueues,
  },
  {
    id: 'diagnostics-treatment',
    order: 4,
    label: 'Diagnostics & Treatment',
    stageIds: ['diagnostics', 'treatment-observation'],
    route: CANONICAL_ROUTES.emergencyDiagnostics,
  },
  {
    id: 'disposition-handoff',
    order: 5,
    label: 'Disposition & Handoff',
    stageIds: ['disposition', 'handoff-reporting'],
    route: CANONICAL_ROUTES.emergencyHandoffs,
  },
  {
    id: 'reporting-analytics',
    order: 6,
    label: 'Reporting & Analytics',
    stageIds: ['outcome-tracking', 'analytics-feedback'],
    route: CANONICAL_ROUTES.emergencyReports,
  },
]);

const PHASE_BY_ID = Object.freeze(
  Object.fromEntries(ED_JOURNEY_PHASES.map((phase) => [phase.id, phase])),
) as Record<EdJourneyPhaseId, (typeof ED_JOURNEY_PHASES)[number]>;

export const ED_OPERATING_SURFACES: readonly EdOperatingSurfaceDefinition[] = Object.freeze([
  {
    surfaceId: 'dispatch',
    label: 'Dispatch Console',
    phaseId: 'pre-arrival',
    journeyStageIds: ['emergency-event', 'emergency-call', 'dispatcher-triage'],
    ownerRole: 'Dispatcher',
    priority: 'P0',
    primaryDecision: 'Assign unit and document life-risk indicators',
    defaultNextAction: 'Dispatch unit or escalate Echo/Delta call',
    threeMinuteRelevant: true,
  },
  {
    surfaceId: 'ems',
    label: 'EMS Pipeline',
    phaseId: 'pre-arrival',
    journeyStageIds: ['ambulance-dispatch', 'ems-en-route', 'ems-arrival-scene', 'prehospital-care', 'hospital-pre-arrival'],
    ownerRole: 'EMS coordinator',
    priority: 'P0',
    primaryDecision: 'Confirm inbound handoff and offload readiness',
    defaultNextAction: 'Review pre-arrival packet and notify charge nurse',
    threeMinuteRelevant: true,
  },
  {
    surfaceId: 'ed-readiness',
    label: 'ED Readiness',
    phaseId: 'pre-arrival',
    journeyStageIds: ['ed-readiness'],
    ownerRole: 'Charge nurse',
    priority: 'P0',
    primaryDecision: 'Prepare bed, staff, and equipment before arrival',
    defaultNextAction: 'Complete equipment checklist and mark bay ready',
    threeMinuteRelevant: true,
  },
  {
    surfaceId: 'reception',
    label: 'Reception',
    phaseId: 'arrival-intake',
    journeyStageIds: ['patient-arrival', 'rapid-intake'],
    ownerRole: 'Registration clerk',
    priority: 'P0',
    primaryDecision: 'Register arrival and prepare patient card for triage',
    defaultNextAction: 'Verify identity and hand off to pretriage queue',
    threeMinuteRelevant: true,
  },
  {
    surfaceId: 'intake',
    label: 'Rapid Intake',
    phaseId: 'arrival-intake',
    journeyStageIds: ['rapid-intake'],
    ownerRole: 'Registration clerk',
    priority: 'P0',
    primaryDecision: 'Capture minimum life-critical demographics and complaint',
    defaultNextAction: 'Complete intake and route to reception handoff',
    threeMinuteRelevant: true,
  },
  {
    surfaceId: 'queues',
    label: 'Patient Queues',
    phaseId: 'triage-assessment',
    journeyStageIds: ['triage'],
    ownerRole: 'Triage nurse',
    priority: 'P0',
    primaryDecision: 'Pull next patient into triage by acuity and wait time',
    defaultNextAction: 'Open pretriage queue and start assessment',
    threeMinuteRelevant: true,
  },
  {
    surfaceId: 'triage',
    label: 'Triage Workspace',
    phaseId: 'triage-assessment',
    journeyStageIds: ['triage', 'ai-chief-review'],
    ownerRole: 'Triage nurse',
    priority: 'P0',
    primaryDecision: 'Assign acuity with vitals, red flags, and clinician override',
    defaultNextAction: 'Complete triage and route to assessment or waiting',
    threeMinuteRelevant: true,
  },
  {
    surfaceId: 'whiteboard',
    label: 'Department Whiteboard',
    phaseId: 'triage-assessment',
    journeyStageIds: ['clinical-action', 'treatment-observation'],
    ownerRole: 'Charge nurse',
    priority: 'P1',
    primaryDecision: 'Resolve who-next and flow bottlenecks across the department',
    defaultNextAction: 'Assign provider and clear blocking queue',
    threeMinuteRelevant: true,
  },
  {
    surfaceId: 'command-center',
    label: 'Hospital Command Center',
    phaseId: 'triage-assessment',
    journeyStageIds: ['ai-chief-review', 'clinical-action'],
    ownerRole: 'ED manager',
    priority: 'P0',
    primaryDecision: 'Assess real-time ED operational state and assign the top critical action',
    defaultNextAction: 'Review live metrics and open the highest-priority workflow',
    threeMinuteRelevant: true,
  },
  {
    surfaceId: 'journey',
    label: 'Full Journey',
    phaseId: 'triage-assessment',
    journeyStageIds: [],
    ownerRole: 'ED manager',
    priority: 'P1',
    primaryDecision: 'Monitor end-to-end journey health from call to disposition',
    defaultNextAction: 'Open the stage with active or attention status',
    threeMinuteRelevant: true,
  },
  {
    surfaceId: 'alerts',
    label: 'Critical Alerts',
    phaseId: 'triage-assessment',
    journeyStageIds: ['clinical-action'],
    ownerRole: 'Assigned clinician',
    priority: 'P0',
    primaryDecision: 'Acknowledge and respond to critical alert within 3 minutes',
    defaultNextAction: 'Acknowledge alert and document response',
    threeMinuteRelevant: true,
  },
  {
    surfaceId: 'reassessment',
    label: 'Reassessment',
    phaseId: 'triage-assessment',
    journeyStageIds: ['treatment-observation'],
    ownerRole: 'Bedside nurse',
    priority: 'P1',
    primaryDecision: 'Complete due or overdue reassessment for flagged patients',
    defaultNextAction: 'Open next due reassessment and record vitals',
    threeMinuteRelevant: false,
  },
  {
    surfaceId: 'copilot',
    label: 'CareDroid Copilot',
    phaseId: 'triage-assessment',
    journeyStageIds: ['ai-chief-review'],
    ownerRole: 'Clinician',
    priority: 'P1',
    primaryDecision: 'Review AI recommendation and accept, modify, or dismiss',
    defaultNextAction: 'Review case context and confirm next clinical step',
    threeMinuteRelevant: true,
  },
  {
    surfaceId: 'diagnostics',
    label: 'Diagnostics Coordination',
    phaseId: 'diagnostics-treatment',
    journeyStageIds: ['diagnostics'],
    ownerRole: 'Physician',
    priority: 'P1',
    primaryDecision: 'Prioritize STAT diagnostic orders and result follow-up',
    defaultNextAction: 'Review STAT board and assign result owner',
    threeMinuteRelevant: false,
  },
  {
    surfaceId: 'tools',
    label: 'Clinical Tools',
    phaseId: 'diagnostics-treatment',
    journeyStageIds: ['diagnostics', 'treatment-observation'],
    ownerRole: 'Clinician',
    priority: 'P2',
    primaryDecision: 'Run calculator or protocol support for active patient',
    defaultNextAction: 'Open patient-linked tool and document result',
    threeMinuteRelevant: false,
  },
  {
    surfaceId: 'referrals',
    label: 'Referrals',
    phaseId: 'disposition-handoff',
    journeyStageIds: ['disposition'],
    ownerRole: 'Physician',
    priority: 'P2',
    primaryDecision: 'Advance consult, transfer, or admission disposition',
    defaultNextAction: 'Submit or accept pending referral',
    threeMinuteRelevant: false,
  },
  {
    surfaceId: 'capacity',
    label: 'Flow & Capacity',
    phaseId: 'disposition-handoff',
    journeyStageIds: ['disposition'],
    ownerRole: 'Patient flow coordinator',
    priority: 'P1',
    primaryDecision: 'Relieve boarding pressure and assign available beds',
    defaultNextAction: 'Review boarding tab and clear admission blockers',
    threeMinuteRelevant: false,
  },
  {
    surfaceId: 'boarding',
    label: 'Boarding',
    phaseId: 'disposition-handoff',
    journeyStageIds: ['disposition'],
    ownerRole: 'Patient flow coordinator',
    priority: 'P1',
    primaryDecision: 'Move boarding patients to inpatient beds',
    defaultNextAction: 'Escalate longest boarding case',
    threeMinuteRelevant: false,
  },
  {
    surfaceId: 'handoffs',
    label: 'Structured Handoffs',
    phaseId: 'disposition-handoff',
    journeyStageIds: ['handoff-reporting'],
    ownerRole: 'Charge nurse',
    priority: 'P2',
    primaryDecision: 'Complete structured EMS, admission, or discharge handoff',
    defaultNextAction: 'Generate handoff brief and confirm receiving clinician',
    threeMinuteRelevant: false,
  },
  {
    surfaceId: 'reports',
    label: 'Operational Reports',
    phaseId: 'reporting-analytics',
    journeyStageIds: ['outcome-tracking'],
    ownerRole: 'Quality safety officer',
    priority: 'P3',
    primaryDecision: 'Review response compliance and bottleneck outcomes',
    defaultNextAction: 'Export shift report or assign bottleneck owner',
    threeMinuteRelevant: false,
  },
  {
    surfaceId: 'analytics',
    label: 'Analytics',
    phaseId: 'reporting-analytics',
    journeyStageIds: ['analytics-feedback'],
    ownerRole: 'ED manager',
    priority: 'P3',
    primaryDecision: 'Identify throughput trends and staffing adjustments',
    defaultNextAction: 'Review wait-time and triage-time KPIs',
    threeMinuteRelevant: false,
  },
  {
    surfaceId: 'patients',
    label: 'Patients',
    phaseId: 'triage-assessment',
    journeyStageIds: ['clinical-action'],
    ownerRole: 'Care team',
    priority: 'P2',
    primaryDecision: 'Locate patient and confirm assignment and next step',
    defaultNextAction: 'Open patient card and plan handoff',
    threeMinuteRelevant: false,
  },
  {
    surfaceId: 'pulse',
    label: 'Department Pulse',
    phaseId: 'triage-assessment',
    journeyStageIds: ['clinical-action'],
    ownerRole: 'Charge nurse',
    priority: 'P2',
    primaryDecision: 'Assess live department surge and staffing posture',
    defaultNextAction: 'Review pulse metrics and adjust assignments',
    threeMinuteRelevant: false,
  },
  {
    surfaceId: 'shift',
    label: 'Shift Summary',
    phaseId: 'disposition-handoff',
    journeyStageIds: ['handoff-reporting'],
    ownerRole: 'Charge nurse',
    priority: 'P2',
    primaryDecision: 'Prepare shift handoff readiness',
    defaultNextAction: 'Review open items before end of shift',
    threeMinuteRelevant: false,
  },
]);

const SURFACE_BY_ID = Object.freeze(
  Object.fromEntries(ED_OPERATING_SURFACES.map((surface) => [surface.surfaceId, surface])),
) as Record<string, EdOperatingSurfaceDefinition>;

const ROUTE_PREFIX_SURFACE: readonly Readonly<{ prefix: string; surfaceId: string }>[] =
  Object.freeze([
    { prefix: CANONICAL_ROUTES.emergencyDispatch, surfaceId: 'dispatch' },
    { prefix: CANONICAL_ROUTES.emergencyEdReadiness, surfaceId: 'ed-readiness' },
    { prefix: CANONICAL_ROUTES.emergencyReception, surfaceId: 'reception' },
    { prefix: CANONICAL_ROUTES.emergencySelfArrival, surfaceId: 'reception' },
    { prefix: CANONICAL_ROUTES.emergencyIntake, surfaceId: 'intake' },
    { prefix: CANONICAL_ROUTES.emergencyJourney, surfaceId: 'journey' },
    { prefix: CANONICAL_ROUTES.emergencyCommandCenter, surfaceId: 'command-center' },
    { prefix: CANONICAL_ROUTES.emergencyEms, surfaceId: 'ems' },
    { prefix: CANONICAL_ROUTES.emergencyQueues, surfaceId: 'queues' },
    { prefix: CANONICAL_ROUTES.triage, surfaceId: 'triage' },
    { prefix: CANONICAL_ROUTES.emergencyWhiteboard, surfaceId: 'whiteboard' },
    { prefix: CANONICAL_ROUTES.emergencyAlerts, surfaceId: 'alerts' },
    { prefix: CANONICAL_ROUTES.emergencyReassessment, surfaceId: 'reassessment' },
    { prefix: CANONICAL_ROUTES.emergencyCopilot, surfaceId: 'copilot' },
    { prefix: CANONICAL_ROUTES.emergencyDiagnostics, surfaceId: 'diagnostics' },
    { prefix: CANONICAL_ROUTES.emergencyTools, surfaceId: 'tools' },
    { prefix: CANONICAL_ROUTES.emergencyReferrals, surfaceId: 'referrals' },
    { prefix: CANONICAL_ROUTES.emergencyBoarding, surfaceId: 'boarding' },
    { prefix: CANONICAL_ROUTES.emergencyCapacity, surfaceId: 'capacity' },
    { prefix: CANONICAL_ROUTES.emergencyHandoffs, surfaceId: 'handoffs' },
    { prefix: CANONICAL_ROUTES.emergencyReports, surfaceId: 'reports' },
    { prefix: CANONICAL_ROUTES.emergencyAnalytics, surfaceId: 'analytics' },
    { prefix: CANONICAL_ROUTES.emergencyPatients, surfaceId: 'patients' },
    { prefix: CANONICAL_ROUTES.emergencyPulse, surfaceId: 'pulse' },
    { prefix: CANONICAL_ROUTES.emergencyShift, surfaceId: 'shift' },
    { prefix: CANONICAL_ROUTES.alerts, surfaceId: 'alerts' },
    { prefix: CANONICAL_ROUTES.analytics, surfaceId: 'analytics' },
    { prefix: CANONICAL_ROUTES.reports, surfaceId: 'reports' },
    { prefix: CANONICAL_ROUTES.intake, surfaceId: 'intake' },
    { prefix: CANONICAL_ROUTES.queue, surfaceId: 'queues' },
    { prefix: CANONICAL_ROUTES.dashboard, surfaceId: 'command-center' },
  ]);

export function resolveEdOperatingSurfaceFromPath(pathname: string): EdOperatingSurfaceDefinition | null {
  const normalized = pathname.split('?')[0].replace(/\/+$/, '') || '/';
  const pipelineSurface = getEmergencySurface(normalized);
  if (pipelineSurface?.id && SURFACE_BY_ID[pipelineSurface.id]) {
    return SURFACE_BY_ID[pipelineSurface.id];
  }

  const sortedPrefixes = [...ROUTE_PREFIX_SURFACE].sort(
    (left, right) => right.prefix.length - left.prefix.length,
  );
  for (const entry of sortedPrefixes) {
    if (normalized === entry.prefix || normalized.startsWith(`${entry.prefix}/`)) {
      return SURFACE_BY_ID[entry.surfaceId] ?? null;
    }
  }

  return null;
}

export function getEdJourneyPhase(phaseId: EdJourneyPhaseId) {
  return PHASE_BY_ID[phaseId];
}

export function getEdOperatingSurface(surfaceId: string): EdOperatingSurfaceDefinition | null {
  return SURFACE_BY_ID[surfaceId] ?? null;
}

/** Consolidated dashboard routes funnel into the ED OS journey surfaces. */
export const LEGACY_DASHBOARD_REDIRECTS: Readonly<Record<string, string>> = Object.freeze({
  [CANONICAL_ROUTES.dashboard]: CANONICAL_ROUTES.emergencyCommandCenter,
  [CANONICAL_ROUTES.aiChief]: CANONICAL_ROUTES.emergencyCopilot,
  [CANONICAL_ROUTES.executive]: `${CANONICAL_ROUTES.emergencyCommandCenter}?view=executive`,
  [CANONICAL_ROUTES.aiCommandCenter]: `${CANONICAL_ROUTES.emergencyCommandCenter}?view=ai`,
  [CANONICAL_ROUTES.predictiveAnalytics]: `${CANONICAL_ROUTES.emergencyCommandCenter}?view=predictive`,
});