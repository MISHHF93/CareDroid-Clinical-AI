/**
 * Embedded user manual — processes, procedures, and role playbooks.
 * Single source of truth for in-app HelpHub content.
 */
import { CANONICAL_ROUTES } from './routes.config';
import { CAREDROID_PRODUCT } from './caredroidProduct.config';
import { DEMO_JOURNEY_STEPS } from './demoPersonaModel';
import { EMERGENCY_ROLE_IDS, EMERGENCY_ROLE_LABELS } from './emergencyRolePermissions';

export type ManualProcedureStep = Readonly<{
  order: number;
  action: string;
  detail?: string;
}>;

export type ManualTopic = Readonly<{
  id: string;
  title: string;
  eyebrow: string;
  purpose: string;
  route: string;
  roles: readonly string[];
  whenToUse: string;
  procedure: readonly ManualProcedureStep[];
  queues?: readonly { name: string; meaning: string }[];
  tips?: readonly string[];
  relatedTopicIds?: readonly string[];
  notFor?: string;
}>;

export type RolePlaybook = Readonly<{
  roleId: string;
  label: string;
  startHere: string;
  primaryRoutes: readonly string[];
  canDo: readonly string[];
  cannotDo: readonly string[];
  dailyFlow: readonly string[];
}>;

export const MANUAL_PLATFORM_INTRO = Object.freeze({
  title: 'How CareDroid works',
  summary: CAREDROID_PRODUCT.firstResolutionLine,
  principles: Object.freeze([
    'Reception prepares every patient card before clinical teams take over.',
    'Your role controls what you see in the sidebar and what actions you can take.',
    'CareDroid Copilot assists — staff review every suggestion before clinical action.',
    'Pilot mode shows core ED workflows only; platform extensions stay in the background.',
  ]),
  safetyLine: CAREDROID_PRODUCT.safetyLine,
});

export const MANUAL_PATIENT_JOURNEY = Object.freeze([
  { step: 1, label: 'Arrive', where: 'Reception / EMS', outcome: 'Patient record created or EMS unit tracked' },
  { step: 2, label: 'Verify', where: 'Reception verification queue', outcome: 'Identity and documents checked' },
  { step: 3, label: 'Pretriage', where: 'Reception pretriage queue', outcome: 'Ready for nurse triage' },
  { step: 4, label: 'Triage', where: 'Reception or Whiteboard', outcome: 'Acuity assigned, vitals recorded' },
  { step: 5, label: 'Wait / reassess', where: 'Whiteboard + Reassess', outcome: 'Timers and flags monitored' },
  { step: 6, label: 'Provider', where: 'Whiteboard', outcome: 'Assessment, orders, notes' },
  { step: 7, label: 'Disposition', where: 'Patient panel / Referrals', outcome: 'Admit, transfer, or discharge' },
]);

export const MANUAL_TOPICS: readonly ManualTopic[] = Object.freeze([
  {
    id: 'reception',
    title: 'Arrival Dashboard (Reception)',
    eyebrow: 'Front desk · first resolution',
    purpose: 'Register arrivals, verify identity, track EMS pre-arrival, and hand off to triage.',
    route: CANONICAL_ROUTES.emergencyReception,
    roles: [
      EMERGENCY_ROLE_IDS.registrationClerk,
      EMERGENCY_ROLE_IDS.triageNurse,
      EMERGENCY_ROLE_IDS.chargeNurse,
      EMERGENCY_ROLE_IDS.edManager,
    ],
    whenToUse: 'Start every shift here. All walk-ins and most EMS conversions begin at Reception.',
    procedure: [
      { order: 1, action: 'Check EMS pre-arrival', detail: 'Review inbound ambulances before they arrive.' },
      { order: 2, action: 'Register walk-in or convert EMS', detail: 'Use Register walk-in or complete EMS conversion when the unit arrives.' },
      { order: 3, action: 'Verify identity', detail: 'Move patients through the verification queue — ID check or document scan.' },
      { order: 4, action: 'Route to pretriage', detail: 'Registered patients wait in pretriage until triage nurse is ready.' },
      { order: 5, action: 'Escalate high-risk complaints', detail: 'Use escalation when front-desk red flags appear — triage is notified.' },
      { order: 6, action: 'Hand off to triage', detail: 'When pretriage queue is ready, triage nurse picks up the patient card.' },
    ],
    queues: [
      { name: 'EMS', meaning: 'Ambulance patients after pre-arrival or conversion' },
      { name: 'Verification', meaning: 'Waiting for ID check or document scan' },
      { name: 'Pretriage', meaning: 'Registered, awaiting triage nurse' },
      { name: 'Recent arrivals', meaning: 'Walk-ins and conversions in the last 30 minutes' },
    ],
    tips: [
      'Intake is embedded in Reception — you rarely need a separate Intake screen.',
      'Copilot is hidden on Reception to reduce noise; open it from the sidebar after handoff.',
      'Keyboard: N opens new patient registration when your role allows it.',
    ],
    relatedTopicIds: ['ems', 'intake', 'triage-flow'],
  },
  {
    id: 'whiteboard',
    title: 'Department Whiteboard',
    eyebrow: 'Operations · shared patient picture',
    purpose: 'See every active patient, flags, queue position, assignments, and operational alerts.',
    route: CANONICAL_ROUTES.emergencyWhiteboard,
    roles: [
      EMERGENCY_ROLE_IDS.chargeNurse,
      EMERGENCY_ROLE_IDS.physician,
      EMERGENCY_ROLE_IDS.triageNurse,
      EMERGENCY_ROLE_IDS.edManager,
    ],
    whenToUse: 'After reception prepares patient cards — charge nurse and physicians run the department from here.',
    procedure: [
      { order: 1, action: 'Scan patient cards for flags', detail: 'Reassessment breach, long wait, deterioration, high-risk complaints.' },
      { order: 2, action: 'Apply queue filters', detail: 'Focus on waiting, assigned, boarding, or your patients only.' },
      { order: 3, action: 'Open a patient card', detail: 'Vitals, notes, journey, referrals, and copilot context live in the detail panel.' },
      { order: 4, action: 'Move queues or assign staff', detail: 'Charge nurse assigns rooms and staff; role-dependent actions.' },
      { order: 5, action: 'Complete reassessments', detail: 'When timers breach, open Reassess drawer (R) or Reassess screen.' },
    ],
    tips: [
      'Empty board? Register from Reception, convert EMS, or load walkthrough data in Settings.',
      'Registration clerks cannot access Whiteboard — this is intentional in reception-first mode.',
    ],
    relatedTopicIds: ['reassessment', 'patient-detail', 'copilot'],
    notFor: EMERGENCY_ROLE_LABELS[EMERGENCY_ROLE_IDS.registrationClerk],
  },
  {
    id: 'ems',
    title: 'EMS coordination',
    eyebrow: 'Ambulance · offload · handoff',
    purpose: 'Track inbound units, bay readiness, offload delays, and handoff checklists.',
    route: CANONICAL_ROUTES.emergencyEms,
    roles: [EMERGENCY_ROLE_IDS.emsUser, EMERGENCY_ROLE_IDS.chargeNurse, EMERGENCY_ROLE_IDS.triageNurse],
    whenToUse: 'When ambulances are inbound, offloading, or completing handoff to the ED.',
    procedure: [
      { order: 1, action: 'Monitor inbound units and ETA', detail: 'EMS screen or Reception pre-arrival panel.' },
      { order: 2, action: 'Prepare EMS bay', detail: 'When role allows — ready receiving space before arrival.' },
      { order: 3, action: 'Complete handoff checklist', detail: 'Document pre-hospital report and handoff completion.' },
      { order: 4, action: 'Convert to patient record', detail: 'Creates the ED patient card for reception/triage.' },
      { order: 5, action: 'Watch offload timers', detail: 'Delays feed capacity and operational alerts.' },
    ],
    relatedTopicIds: ['reception', 'capacity'],
  },
  {
    id: 'triage-flow',
    title: 'Triage & acuity',
    eyebrow: 'Clinical intake · acuity assignment',
    purpose: 'Assign acuity, record vitals, set flags, and move patients into the correct queue.',
    route: CANONICAL_ROUTES.emergencyReception,
    roles: [EMERGENCY_ROLE_IDS.triageNurse],
    whenToUse: 'When pretriage queue patients are ready for nurse assessment.',
    procedure: [
      { order: 1, action: 'Open pretriage queue', detail: 'Reception route with pretriage filter or triage screen mode.' },
      { order: 2, action: 'Record vitals and chief complaint', detail: 'Complete triage documentation on the patient card.' },
      { order: 3, action: 'Assign acuity', detail: 'Staff decision — copilot may suggest context but does not assign autonomously.' },
      { order: 4, action: 'Set reassessment interval', detail: 'Timers appear on whiteboard and reassessment screens.' },
      { order: 5, action: 'Move to waiting or provider queue', detail: 'Patient card updates for charge nurse and physicians.' },
    ],
    relatedTopicIds: ['reception', 'whiteboard', 'reassessment'],
  },
  {
    id: 'reassessment',
    title: 'Reassessment & timers',
    eyebrow: 'Safety · waiting room · recheck',
    purpose: 'Track patients due for reassessment and respond to timer breaches.',
    route: CANONICAL_ROUTES.emergencyReassessment,
    roles: [EMERGENCY_ROLE_IDS.chargeNurse, EMERGENCY_ROLE_IDS.triageNurse, EMERGENCY_ROLE_IDS.physician],
    whenToUse: 'When flags show reassessment due, or you need the dedicated recheck queue.',
    procedure: [
      { order: 1, action: 'Check Reassess badge on sidebar', detail: 'Count of patients needing recheck.' },
      { order: 2, action: 'Press R for reassessment drawer', detail: 'Quick access from any screen when permitted.' },
      { order: 3, action: 'Open Reassess screen', detail: 'Full queue of due and overdue patients.' },
      { order: 4, action: 'Complete reassessment on patient card', detail: 'Update vitals, notes, and flags.' },
    ],
    relatedTopicIds: ['whiteboard'],
  },
  {
    id: 'capacity',
    title: 'Flow & Capacity',
    eyebrow: 'Beds · surge · boarding',
    purpose: 'Department capacity score, queue health, boarding pressure, and surge visibility.',
    route: CANONICAL_ROUTES.emergencyCapacity,
    roles: [EMERGENCY_ROLE_IDS.chargeNurse, EMERGENCY_ROLE_IDS.edManager],
    whenToUse: 'When boarding delays, EMS offload pressure, or surge planning is needed.',
    procedure: [
      { order: 1, action: 'Review capacity score and band', detail: 'Green / yellow / red indicators on capacity screen.' },
      { order: 2, action: 'Inspect queue health', detail: 'Which queues are breaching wait thresholds.' },
      { order: 3, action: 'Open boarding view', detail: 'Capacity route with ?view=boarding or Boarding command.' },
      { order: 4, action: 'Coordinate with charge nurse flow actions', detail: 'Reassign, divert, or escalate per department policy.' },
    ],
    relatedTopicIds: ['whiteboard', 'ems'],
  },
  {
    id: 'referrals',
    title: 'Referrals & transfers',
    eyebrow: 'Disposition · outbound coordination',
    purpose: 'Create and track referrals, transfers, and outbound consult coordination.',
    route: CANONICAL_ROUTES.emergencyReferrals,
    roles: [EMERGENCY_ROLE_IDS.physician, EMERGENCY_ROLE_IDS.chargeNurse, EMERGENCY_ROLE_IDS.edManager],
    whenToUse: 'When a patient needs transfer, specialist referral, or outbound handoff.',
    procedure: [
      { order: 1, action: 'Open Referrals from sidebar or patient panel', detail: 'Link referral to patient when possible.' },
      { order: 2, action: 'Document referral reason and urgency', detail: 'Staff-owned clinical decision.' },
      { order: 3, action: 'Track acceptance and delays', detail: 'Referral hub shows stalled outbound cases.' },
    ],
    relatedTopicIds: ['patient-detail', 'whiteboard'],
  },
  {
    id: 'copilot',
    title: 'CareDroid Copilot',
    eyebrow: 'AI assist · human review required',
    purpose: 'Case-aware assistant for summaries, context, evidence, and workflow prompts.',
    route: CANONICAL_ROUTES.emergencyCopilot,
    roles: [
      EMERGENCY_ROLE_IDS.physician,
      EMERGENCY_ROLE_IDS.triageNurse,
      EMERGENCY_ROLE_IDS.chargeNurse,
      EMERGENCY_ROLE_IDS.edManager,
    ],
    whenToUse: 'When you need department context, patient summary, or tool recommendations — not on reception desk.',
    procedure: [
      { order: 1, action: 'Open Copilot', detail: 'Sidebar, session chrome (C), header badge, or command palette.' },
      { order: 2, action: 'Select patient context if needed', detail: 'Select a patient on whiteboard first for patient-specific answers.' },
      { order: 3, action: 'Ask or use quick actions', detail: 'Summaries, reassessment signals, calculator launches.' },
      { order: 4, action: 'Review before acting', detail: CAREDROID_PRODUCT.safetyLine },
    ],
    tips: [
      'Copilot does not diagnose, prescribe, disposition, or write to your EHR autonomously.',
      'Hidden on Reception screen — open after clinical handoff.',
    ],
    relatedTopicIds: ['whiteboard', 'tools'],
  },
  {
    id: 'tools',
    title: 'Medical Tools & calculators',
    eyebrow: 'Clinical support · scores',
    purpose: 'qSOFA, NEWS2, HEART, Wells, GCS, NIHSS, and specialty calculator catalogs.',
    route: CANONICAL_ROUTES.emergencyTools,
    roles: Object.values(EMERGENCY_ROLE_IDS),
    whenToUse: 'At bedside or during documentation when a validated score or calculator is needed.',
    procedure: [
      { order: 1, action: 'Open Medical Tools from sidebar', detail: 'Or command palette — type calculator name.' },
      { order: 2, action: 'Attach patient context when available', detail: 'Patient bar pre-fills demographics when selected.' },
      { order: 3, action: 'Run calculator and document result', detail: 'Staff records outcome in clinical workflow.' },
    ],
    relatedTopicIds: ['copilot'],
  },
  {
    id: 'patients',
    title: 'Patients registry',
    eyebrow: 'Search · encounters',
    purpose: 'Find patients by name, MRN, or encounter — broader than reception queue view.',
    route: CANONICAL_ROUTES.emergencyPatients,
    roles: Object.values(EMERGENCY_ROLE_IDS),
    whenToUse: 'When you need to look up a patient outside the reception queue workflow.',
    procedure: [
      { order: 1, action: 'Search from Patients screen or header lookup', detail: 'Ctrl/Cmd+K also searches operational entities.' },
      { order: 2, action: 'Open patient detail panel', detail: 'Full journey, vitals, and notes.' },
    ],
    relatedTopicIds: ['patient-detail', 'reception'],
  },
  {
    id: 'queues',
    title: 'Queue intelligence',
    eyebrow: 'Bottlenecks · flow',
    purpose: 'Department-wide queue view — where patients are waiting and why.',
    route: CANONICAL_ROUTES.emergencyQueues,
    roles: [EMERGENCY_ROLE_IDS.chargeNurse, EMERGENCY_ROLE_IDS.edManager, EMERGENCY_ROLE_IDS.triageNurse],
    whenToUse: 'Charge nurse flow huddles and bottleneck identification.',
    procedure: [
      { order: 1, action: 'Review queue list and breach indicators', detail: 'Compare with whiteboard filters.' },
      { order: 2, action: 'Coordinate moves with charge nurse actions', detail: 'Queue moves require appropriate role.' },
    ],
    relatedTopicIds: ['whiteboard', 'capacity'],
  },
  {
    id: 'pulse',
    title: 'Department Pulse',
    eyebrow: 'Real-time · situational awareness',
    purpose: 'Live department pulse metrics for charge nurse and manager huddles.',
    route: CANONICAL_ROUTES.emergencyPulse,
    roles: [EMERGENCY_ROLE_IDS.chargeNurse, EMERGENCY_ROLE_IDS.edManager, EMERGENCY_ROLE_IDS.registrationClerk],
    whenToUse: 'Quick operational snapshot without opening full analytics.',
    procedure: [
      { order: 1, action: 'Open Pulse from utility section of sidebar', detail: 'Available to most clinical roles in pilot.' },
      { order: 2, action: 'Use with Whiteboard for action', detail: 'Pulse shows status; whiteboard is where you act.' },
    ],
    relatedTopicIds: ['analytics', 'whiteboard'],
  },
  {
    id: 'shift',
    title: 'Shift summary',
    eyebrow: 'Handoff · end of shift',
    purpose: 'Shift-level summary and handoff notes for nursing and operations.',
    route: CANONICAL_ROUTES.emergencyShift,
    roles: [EMERGENCY_ROLE_IDS.chargeNurse, EMERGENCY_ROLE_IDS.edManager, EMERGENCY_ROLE_IDS.registrationClerk],
    whenToUse: 'End of shift or mid-shift handoff between charge roles.',
    procedure: [
      { order: 1, action: 'Review open patients and breaches', detail: 'Cross-check with whiteboard before handoff.' },
      { order: 2, action: 'Document handoff items', detail: 'Per department policy.' },
    ],
    relatedTopicIds: ['whiteboard'],
  },
  {
    id: 'analytics',
    title: 'Analytics',
    eyebrow: 'Throughput · KPIs',
    purpose: 'Department throughput, wait times, and operational analytics.',
    route: CANONICAL_ROUTES.emergencyAnalytics,
    roles: [EMERGENCY_ROLE_IDS.edManager, EMERGENCY_ROLE_IDS.chargeNurse],
    whenToUse: 'Manager reviews, quality huddles, and post-shift analysis.',
    procedure: [
      { order: 1, action: 'Open Analytics from sidebar', detail: 'ED manager has full view; charge nurse scoped view.' },
      { order: 2, action: 'Compare with live Pulse and Whiteboard', detail: 'Analytics is retrospective; board is live.' },
    ],
    relatedTopicIds: ['pulse', 'capacity'],
  },
  {
    id: 'settings',
    title: 'Settings & demo data',
    eyebrow: 'Configuration · training',
    purpose: 'Department preferences, thresholds, and walkthrough dataset for demos.',
    route: CANONICAL_ROUTES.emergencySettings,
    roles: [EMERGENCY_ROLE_IDS.admin, EMERGENCY_ROLE_IDS.edManager],
    whenToUse: 'Load demo patients when board is empty, or adjust department display settings.',
    procedure: [
      { order: 1, action: 'Load walkthrough dataset', detail: 'Populates whiteboard for training demos.' },
      { order: 2, action: 'Review thresholds and modules', detail: 'Admin and manager roles.' },
    ],
    relatedTopicIds: ['whiteboard'],
  },
  {
    id: 'patient-detail',
    title: 'Patient detail panel',
    eyebrow: 'Single patient · full chart slice',
    purpose: 'Journey, vitals, notes, referrals, and copilot context for one patient.',
    route: CANONICAL_ROUTES.emergencyWhiteboard,
    roles: Object.values(EMERGENCY_ROLE_IDS),
    whenToUse: 'Whenever you click a patient card or select a search result.',
    procedure: [
      { order: 1, action: 'Open from whiteboard card or search', detail: 'Panel slides over main content.' },
      { order: 2, action: 'Review journey and flags', detail: 'See queue history and active alerts.' },
      { order: 3, action: 'Document vitals and notes', detail: 'Role-gated write actions.' },
      { order: 4, action: 'Launch copilot or tools from panel', detail: 'Patient context carries forward.' },
    ],
    relatedTopicIds: ['whiteboard', 'copilot', 'tools'],
  },
  {
    id: 'intake',
    title: 'Smart Intake (embedded)',
    eyebrow: 'Registration · demographics',
    purpose: 'Collect demographics and chief complaint — usually launched from Reception, not standalone nav.',
    route: CANONICAL_ROUTES.emergencyIntake,
    roles: [EMERGENCY_ROLE_IDS.registrationClerk, EMERGENCY_ROLE_IDS.triageNurse],
    whenToUse: 'Register walk-in, express registration, or embedded intake from reception queues.',
    procedure: [
      { order: 1, action: 'Start from Reception action buttons', detail: 'Register walk-in or ?intake=1 on reception URL.' },
      { order: 2, action: 'Complete demographics and complaint', detail: 'Verification step when required.' },
      { order: 3, action: 'Submit to pretriage queue', detail: 'Patient card appears on whiteboard after handoff.' },
    ],
    relatedTopicIds: ['reception'],
  },
  {
    id: 'platform-start',
    title: 'Platform entry hub',
    eyebrow: 'Orientation · choose your path',
    purpose: 'Choose demo entry, clinical workspace, or admin console.',
    route: CANONICAL_ROUTES.platformStart,
    roles: Object.values(EMERGENCY_ROLE_IDS),
    whenToUse: 'First visit or when orienting new staff to the demo.',
    procedure: [
      { order: 1, action: 'Start at reception demo', detail: 'Recommended for frontline staff.' },
      { order: 2, action: 'Or open clinical workspace', detail: 'Lands on your role home route.' },
      { order: 3, action: 'Follow demo journey A–K', detail: 'Open Guide → Full process tab.' },
    ],
    relatedTopicIds: ['reception'],
  },
]);

export const MANUAL_ROLE_PLAYBOOKS: readonly RolePlaybook[] = Object.freeze([
  {
    roleId: EMERGENCY_ROLE_IDS.registrationClerk,
    label: EMERGENCY_ROLE_LABELS[EMERGENCY_ROLE_IDS.registrationClerk],
    startHere: CANONICAL_ROUTES.emergencyReception,
    primaryRoutes: [
      CANONICAL_ROUTES.emergencyReception,
      CANONICAL_ROUTES.emergencyPatients,
      CANONICAL_ROUTES.emergencyPulse,
      CANONICAL_ROUTES.emergencyShift,
    ],
    canDo: ['Register walk-ins', 'Verify identity', 'Convert EMS arrivals', 'Escalate to triage', 'Search patients'],
    cannotDo: ['Assign acuity', 'Move clinical queues', 'Write clinical notes', 'Open Whiteboard'],
    dailyFlow: [
      'Land on Reception',
      'Process EMS pre-arrivals and walk-ins',
      'Clear verification and pretriage queues',
      'Escalate red-flag complaints',
      'Hand off to triage nurse',
    ],
  },
  {
    roleId: EMERGENCY_ROLE_IDS.triageNurse,
    label: EMERGENCY_ROLE_LABELS[EMERGENCY_ROLE_IDS.triageNurse],
    startHere: CANONICAL_ROUTES.emergencyReception,
    primaryRoutes: [
      CANONICAL_ROUTES.emergencyReception,
      CANONICAL_ROUTES.emergencyWhiteboard,
      CANONICAL_ROUTES.emergencyEms,
      CANONICAL_ROUTES.emergencyReassessment,
      CANONICAL_ROUTES.emergencyTools,
    ],
    canDo: ['Triage and acuity', 'Vitals and flags', 'Queue moves', 'EMS handoff support', 'Use Copilot'],
    cannotDo: ['Final disposition', 'Full analytics admin'],
    dailyFlow: [
      'Open pretriage queue on Reception',
      'Triage and assign acuity',
      'Move patients to waiting or provider queue',
      'Monitor reassessment flags on Whiteboard',
    ],
  },
  {
    roleId: EMERGENCY_ROLE_IDS.chargeNurse,
    label: EMERGENCY_ROLE_LABELS[EMERGENCY_ROLE_IDS.chargeNurse],
    startHere: CANONICAL_ROUTES.emergencyWhiteboard,
    primaryRoutes: [
      CANONICAL_ROUTES.emergencyWhiteboard,
      CANONICAL_ROUTES.emergencyQueues,
      CANONICAL_ROUTES.emergencyReassessment,
      CANONICAL_ROUTES.emergencyCapacity,
      CANONICAL_ROUTES.emergencyEms,
    ],
    canDo: ['Flow control', 'Staff and room assignment', 'Reassessment oversight', 'Capacity and boarding'],
    cannotDo: ['Registration-only actions'],
    dailyFlow: [
      'Scan Whiteboard for breaches and LWBS risk',
      'Run queue and reassessment huddles',
      'Assign beds and staff',
      'Watch capacity and EMS offload',
    ],
  },
  {
    roleId: EMERGENCY_ROLE_IDS.physician,
    label: EMERGENCY_ROLE_LABELS[EMERGENCY_ROLE_IDS.physician],
    startHere: CANONICAL_ROUTES.emergencyWhiteboard,
    primaryRoutes: [
      CANONICAL_ROUTES.emergencyWhiteboard,
      CANONICAL_ROUTES.emergencyPatients,
      CANONICAL_ROUTES.emergencyReferrals,
      CANONICAL_ROUTES.emergencyTools,
    ],
    canDo: ['Review patients', 'Clinical notes', 'Referrals', 'Disposition', 'Copilot and calculators'],
    cannotDo: ['Registration and verification', 'Front-desk escalation-only actions'],
    dailyFlow: [
      'Filter Whiteboard to assigned patients',
      'Open patient detail for assessment',
      'Document and order per policy',
      'Disposition via referrals or discharge',
    ],
  },
  {
    roleId: EMERGENCY_ROLE_IDS.emsUser,
    label: EMERGENCY_ROLE_LABELS[EMERGENCY_ROLE_IDS.emsUser],
    startHere: CANONICAL_ROUTES.emergencyEms,
    primaryRoutes: [CANONICAL_ROUTES.emergencyEms, CANONICAL_ROUTES.emergencyReception],
    canDo: ['Track offload', 'Handoff checklist', 'Prepare bay', 'Convert arrival'],
    cannotDo: ['Triage acuity assignment', 'Disposition'],
    dailyFlow: [
      'Monitor inbound units on EMS screen',
      'Complete handoff on arrival',
      'Convert to ED patient record',
      'Coordinate with reception for registration',
    ],
  },
  {
    roleId: EMERGENCY_ROLE_IDS.edManager,
    label: EMERGENCY_ROLE_LABELS[EMERGENCY_ROLE_IDS.edManager],
    startHere: CANONICAL_ROUTES.emergencyReception,
    primaryRoutes: [
      CANONICAL_ROUTES.emergencyWhiteboard,
      CANONICAL_ROUTES.emergencyAnalytics,
      CANONICAL_ROUTES.emergencyCapacity,
      CANONICAL_ROUTES.emergencyPulse,
      CANONICAL_ROUTES.emergencyShift,
    ],
    canDo: ['Throughput oversight', 'Analytics', 'Capacity', 'Transfers', 'Department operations'],
    cannotDo: [],
    dailyFlow: [
      'Morning huddle via Pulse and Whiteboard',
      'Monitor analytics and capacity',
      'Support charge nurse on surge',
      'End-of-shift review',
    ],
  },
]);

export const MANUAL_SHORTCUTS = Object.freeze([
  { keys: '?', action: 'Open this Guide' },
  { keys: 'Ctrl/Cmd + K', action: 'Command palette — search patients, routes, actions' },
  { keys: 'C', action: 'Toggle CareDroid Copilot (when permitted)' },
  { keys: 'R', action: 'Reassessment drawer (charge / triage / physician)' },
  { keys: 'N', action: 'New patient — routes to reception create path' },
  { keys: 'Shift + H', action: 'Go to your role home screen' },
  { keys: 'Escape', action: 'Close panels — copilot, patient, palette' },
  { keys: '/', action: 'Focus reception search (on Reception) or open palette' },
]);

const TOPIC_BY_ID = new Map(MANUAL_TOPICS.map((t) => [t.id, t]));

export function getManualTopicById(id: string): ManualTopic | undefined {
  return TOPIC_BY_ID.get(id);
}

export function resolveManualTopicForPath(pathname: string): ManualTopic | undefined {
  const normalized = pathname.split('?')[0];
  const exact = MANUAL_TOPICS.find((t) => t.route === normalized);
  if (exact) return exact;
  if (normalized.startsWith(CANONICAL_ROUTES.emergencyTools) || normalized.startsWith('/tools')) {
    return getManualTopicById('tools');
  }
  if (normalized.startsWith(CANONICAL_ROUTES.emergencyCopilot)) {
    return getManualTopicById('copilot');
  }
  if (normalized === CANONICAL_ROUTES.platformStart) {
    return getManualTopicById('platform-start');
  }
  if (normalized === CANONICAL_ROUTES.emergencyHelp) {
    return undefined;
  }
  return MANUAL_TOPICS.find((t) => normalized.startsWith(t.route));
}

export function resolveRolePlaybook(roleId: string): RolePlaybook | undefined {
  return MANUAL_ROLE_PLAYBOOKS.find((p) => p.roleId === roleId);
}

export function listTopicsForRole(roleId: string): ManualTopic[] {
  return MANUAL_TOPICS.filter((t) => t.roles.includes(roleId) || t.roles.length === Object.values(EMERGENCY_ROLE_IDS).length);
}

export { DEMO_JOURNEY_STEPS as MANUAL_DEMO_JOURNEY };