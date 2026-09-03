/**
 * Embedded user manual — processes, procedures, and role playbooks.
 * Single source of truth for in-app HelpHub content.
 */
import { CANONICAL_ROUTES, getRouteByPath } from './routes.config';
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
  {
    step: 1,
    label: 'Emergency Event',
    where: 'Caller / bystander / facility',
    outcome: 'Emergency signal and immediate risk captured',
  },
  {
    step: 2,
    label: 'Emergency Call / 911 Contact',
    where: 'Dispatch Console',
    outcome: 'Location, callback, complaint, hazards, and life-risk indicators recorded',
  },
  {
    step: 3,
    label: 'Dispatcher Triage',
    where: 'Dispatch Console',
    outcome: 'Priority, protocol, and pre-arrival instructions documented',
  },
  {
    step: 4,
    label: 'Ambulance Dispatch',
    where: 'Dispatch + EMS Board',
    outcome: 'Unit assigned with ETA, crew, and special instructions',
  },
  {
    step: 5,
    label: 'EMS En Route',
    where: 'EMS Board',
    outcome: 'Crew receives suspected condition, location, hazards, and risk summary',
  },
  {
    step: 6,
    label: 'EMS Arrival / Scene Assessment',
    where: 'EMS Board',
    outcome: 'Scene safety, ABCs, vitals, history, medications, allergies, and red flags captured',
  },
  {
    step: 7,
    label: 'Prehospital Care',
    where: 'EMS Board',
    outcome: 'Interventions, severity updates, and transport decision recorded',
  },
  {
    step: 8,
    label: 'Hospital Pre-Arrival Notification',
    where: 'EMS + Alerts',
    outcome: 'MIST/SBAR packet alerts ED, triage, charge nurse, and physician',
  },
  {
    step: 9,
    label: 'ED Readiness',
    where: 'ED Readiness',
    outcome: 'Bed, staff, equipment, specialty team, lab, radiology, and pharmacy prepared',
  },
  {
    step: 10,
    label: 'Patient Arrival',
    where: 'Reception / EMS',
    outcome: 'Ambulance, walk-in, transfer, or referral enters the ED workflow',
  },
  {
    step: 11,
    label: 'Rapid Intake',
    where: 'Intake / Reception',
    outcome: 'Minimum life-critical data captured or confirmed',
  },
  {
    step: 12,
    label: 'Triage',
    where: 'Reception / Triage queue',
    outcome: 'ESI-style five-level acuity support with clinician confirmation',
  },
  {
    step: 13,
    label: 'AI Chief Review',
    where: 'AI Chief',
    outcome: 'Risk, missing data, routing, next action, and escalation summarized for human review',
  },
  {
    step: 14,
    label: 'Clinical Action',
    where: 'Whiteboard',
    outcome:
      'Nurse or physician reviews, accepts, modifies, or dismisses recommendation and begins care',
  },
  {
    step: 15,
    label: 'Diagnostics',
    where: 'Diagnostics',
    outcome: 'Labs, imaging, ECG, medication review, and consult workflows coordinated',
  },
  {
    step: 16,
    label: 'Treatment / Observation',
    where: 'Whiteboard',
    outcome: 'Care plan, monitoring, reassessment, interventions, and observation tracked',
  },
  {
    step: 17,
    label: 'Disposition',
    where: 'Referrals / Capacity',
    outcome:
      'Discharge, admit, transfer, observation, ICU, OR, or specialty care decision recorded',
  },
  {
    step: 18,
    label: 'Handoff / Reporting',
    where: 'Handoffs / Shift Summary',
    outcome: 'Structured handoff generated for the next team or department',
  },
  {
    step: 19,
    label: 'Outcome Tracking',
    where: 'Reports',
    outcome: 'Response, triage, treatment, delay, bottleneck, and patient-flow outcomes tracked',
  },
  {
    step: 20,
    label: 'Analytics Feedback',
    where: 'Analytics',
    outcome:
      'Operational data improves staffing, routing, bottleneck detection, and 3-minute compliance',
  },
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
      {
        order: 1,
        action: 'Check EMS pre-arrival',
        detail: 'Review inbound ambulances before they arrive.',
      },
      {
        order: 2,
        action: 'Register walk-in or convert EMS',
        detail: 'Use Register walk-in or complete EMS conversion when the unit arrives.',
      },
      {
        order: 3,
        action: 'Verify identity',
        detail: 'Move patients through the verification queue — ID check or document scan.',
      },
      {
        order: 4,
        action: 'Route to pretriage',
        detail: 'Registered patients wait in pretriage until triage nurse is ready.',
      },
      {
        order: 5,
        action: 'Escalate high-risk complaints',
        detail: 'Use escalation when front-desk red flags appear — triage is notified.',
      },
      {
        order: 6,
        action: 'Hand off to triage',
        detail: 'When pretriage queue is ready, triage nurse picks up the patient card.',
      },
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
    purpose:
      'See every active patient, flags, queue position, assignments, and operational alerts.',
    route: CANONICAL_ROUTES.emergencyWhiteboard,
    roles: [
      EMERGENCY_ROLE_IDS.chargeNurse,
      EMERGENCY_ROLE_IDS.physician,
      EMERGENCY_ROLE_IDS.triageNurse,
      EMERGENCY_ROLE_IDS.edManager,
    ],
    whenToUse:
      'After reception prepares patient cards — charge nurse and physicians run the department from here.',
    procedure: [
      {
        order: 1,
        action: 'Scan patient cards for flags',
        detail: 'Reassessment breach, long wait, deterioration, high-risk complaints.',
      },
      {
        order: 2,
        action: 'Apply queue filters',
        detail: 'Focus on waiting, assigned, boarding, or your patients only.',
      },
      {
        order: 3,
        action: 'Open a patient card',
        detail: 'Vitals, notes, journey, referrals, and copilot context live in the detail panel.',
      },
      {
        order: 4,
        action: 'Move queues or assign staff',
        detail: 'Charge nurse assigns rooms and staff; role-dependent actions.',
      },
      {
        order: 5,
        action: 'Complete reassessments',
        detail: 'When timers breach, open Reassess drawer (R) or Reassess screen.',
      },
    ],
    tips: [
      'Empty board? Register from Reception, convert EMS, or load walkthrough data in Settings.',
      'Registration clerks cannot access Whiteboard — this is intentional in reception-first mode.',
    ],
    relatedTopicIds: ['reassessment', 'patient-detail', 'copilot'],
    notFor: EMERGENCY_ROLE_LABELS[EMERGENCY_ROLE_IDS.registrationClerk],
  },
  {
    id: 'dispatch-console',
    title: 'Dispatch Console',
    eyebrow: 'Pre-hospital · 911 call intake',
    purpose:
      'Log emergency calls, perform telephone triage, assign EMS units, and notify the ED of inbound critical patients.',
    route: CANONICAL_ROUTES.emergencyDispatch,
    roles: [
      EMERGENCY_ROLE_IDS.dispatcher,
      EMERGENCY_ROLE_IDS.emsCoordinator,
      EMERGENCY_ROLE_IDS.admin,
    ],
    whenToUse:
      'When a 911 call is received and must be triaged, prioritized, and dispatched to an EMS unit.',
    procedure: [
      {
        order: 1,
        action: 'Log the incoming call',
        detail:
          'Enter chief complaint, address, caller name if available, and critical safety flags (conscious/breathing).',
      },
      {
        order: 2,
        action: 'Assign initial call priority',
        detail:
          'Use Echo (life threatening) through Alpha (non-urgent) based on determinant codes.',
      },
      {
        order: 3,
        action: 'Issue pre-arrival instructions',
        detail:
          'Keep caller on the line and guide bystander response (CPR, bleeding control, positioning).',
      },
      {
        order: 4,
        action: 'Dispatch the appropriate unit',
        detail: 'Assign ALS or BLS based on call priority. Echo/Delta calls require ALS response.',
      },
      {
        order: 5,
        action: 'Track unit status',
        detail:
          'Update status from Dispatched → En Route → On Scene → Transporting as crew confirms.',
      },
      {
        order: 6,
        action: 'Notify the receiving ED for Echo/Delta patients',
        detail:
          'Critical patients trigger a pre-arrival notification to the charge nurse. Use the Notify Hospital action.',
      },
    ],
    tips: [
      'Echo and Delta calls (life threatening/emergent) must trigger hospital pre-notification.',
      'AI call risk summary is available for Echo/Delta calls — dispatcher must confirm and apply local protocol.',
      'Do not close a call until the patient is confirmed arrived at hospital or call is cancelled.',
    ],
    relatedTopicIds: ['ems', 'three-minute-response'],
  },
  {
    id: 'prehospital-coordination',
    title: 'Prehospital Coordination',
    eyebrow: 'EMS en route · pre-arrival relay',
    purpose:
      'Coordinate EMS field assessment data, relay critical findings to the ED, and activate pre-arrival readiness protocols.',
    route: CANONICAL_ROUTES.emergencyEms,
    roles: [
      EMERGENCY_ROLE_IDS.emsCoordinator,
      EMERGENCY_ROLE_IDS.chargeNurse,
      EMERGENCY_ROLE_IDS.emsUser,
    ],
    whenToUse:
      'When an EMS unit is en route with a critical patient and the ED must be prepared before arrival.',
    procedure: [
      {
        order: 1,
        action: 'Receive prehospital assessment from crew',
        detail: 'Field vitals, mechanism of injury, interventions, and current patient status.',
      },
      {
        order: 2,
        action: 'Identify critical alerts',
        detail: 'Stroke alert, STEMI, trauma activation, sepsis, OB emergency, pediatric arrest.',
      },
      {
        order: 3,
        action: 'Submit pre-arrival notification (MIST/SBAR)',
        detail:
          'Use the EMS screen to send structured notification to receiving ED. MIST: Mechanism, Injuries, Signs, Treatment.',
      },
      {
        order: 4,
        action: 'Activate the ED Readiness Plan',
        detail:
          'ED charge nurse and coordinator prepare the receiving bay, specialty teams, and equipment per the pre-arrival data.',
      },
      {
        order: 5,
        action: 'Relay ETA updates',
        detail: 'Update estimated arrival time as scene or route conditions change.',
      },
      {
        order: 6,
        action: 'Handoff at arrival',
        detail: 'Crew completes the ambulance handoff checklist and transfers care to the ED team.',
      },
    ],
    tips: [
      'A 3-minute response timer may start from EMS pre-arrival for Echo-priority patients even before arrival.',
      'AI prehospital risk summary can assist the charge nurse — licensed staff must confirm before resource activation.',
      'All resource activations (trauma team, cath lab) require a licensed clinician to authorize.',
    ],
    relatedTopicIds: ['dispatch-console', 'ems', 'three-minute-response'],
  },
  {
    id: 'ems',
    title: 'EMS coordination',
    eyebrow: 'Ambulance · offload · handoff',
    purpose: 'Track inbound units, bay readiness, offload delays, and handoff checklists.',
    route: CANONICAL_ROUTES.emergencyEms,
    roles: [
      EMERGENCY_ROLE_IDS.emsUser,
      EMERGENCY_ROLE_IDS.chargeNurse,
      EMERGENCY_ROLE_IDS.triageNurse,
    ],
    whenToUse: 'When ambulances are inbound, offloading, or completing handoff to the ED.',
    procedure: [
      {
        order: 1,
        action: 'Monitor inbound units and ETA',
        detail: 'EMS screen or Reception pre-arrival panel.',
      },
      {
        order: 2,
        action: 'Prepare EMS bay',
        detail: 'When role allows — ready receiving space before arrival.',
      },
      {
        order: 3,
        action: 'Complete handoff checklist',
        detail: 'Document pre-hospital report and handoff completion.',
      },
      {
        order: 4,
        action: 'Convert to patient record',
        detail: 'Creates the ED patient card for reception/triage.',
      },
      {
        order: 5,
        action: 'Watch offload timers',
        detail: 'Delays feed capacity and operational alerts.',
      },
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
      {
        order: 1,
        action: 'Open pretriage queue',
        detail: 'Reception route with pretriage filter or triage screen mode.',
      },
      {
        order: 2,
        action: 'Record vitals and chief complaint',
        detail: 'Complete triage documentation on the patient card.',
      },
      {
        order: 3,
        action: 'Assign acuity',
        detail: 'Staff decision — copilot may suggest context but does not assign autonomously.',
      },
      {
        order: 4,
        action: 'Set reassessment interval',
        detail: 'Timers appear on whiteboard and reassessment screens.',
      },
      {
        order: 5,
        action: 'Move to waiting or provider queue',
        detail: 'Patient card updates for charge nurse and physicians.',
      },
    ],
    relatedTopicIds: ['reception', 'whiteboard', 'reassessment'],
  },
  {
    id: 'reassessment',
    title: 'Reassessment & timers',
    eyebrow: 'Safety · waiting room · recheck',
    purpose: 'Track patients due for reassessment and respond to timer breaches.',
    route: CANONICAL_ROUTES.emergencyReassessment,
    roles: [
      EMERGENCY_ROLE_IDS.chargeNurse,
      EMERGENCY_ROLE_IDS.triageNurse,
      EMERGENCY_ROLE_IDS.physician,
    ],
    whenToUse: 'When flags show reassessment due, or you need the dedicated recheck queue.',
    procedure: [
      {
        order: 1,
        action: 'Check Reassess badge on sidebar',
        detail: 'Count of patients needing recheck.',
      },
      {
        order: 2,
        action: 'Press R for reassessment drawer',
        detail: 'Quick access from any screen when permitted.',
      },
      {
        order: 3,
        action: 'Open Reassess screen',
        detail: 'Full queue of due and overdue patients.',
      },
      {
        order: 4,
        action: 'Complete reassessment on patient card',
        detail: 'Update vitals, notes, and flags.',
      },
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
      {
        order: 1,
        action: 'Review capacity score and band',
        detail: 'Green / yellow / red indicators on capacity screen.',
      },
      {
        order: 2,
        action: 'Inspect queue health',
        detail: 'Which queues are breaching wait thresholds.',
      },
      {
        order: 3,
        action: 'Open boarding view',
        detail: 'Capacity route with ?view=boarding or Boarding command.',
      },
      {
        order: 4,
        action: 'Coordinate with charge nurse flow actions',
        detail: 'Reassign, divert, or escalate per department policy.',
      },
    ],
    relatedTopicIds: ['whiteboard', 'ems'],
  },
  {
    id: 'referrals',
    title: 'Referrals & transfers',
    eyebrow: 'Disposition · outbound coordination',
    purpose: 'Create and track referrals, transfers, and outbound consult coordination.',
    route: CANONICAL_ROUTES.emergencyReferrals,
    roles: [
      EMERGENCY_ROLE_IDS.physician,
      EMERGENCY_ROLE_IDS.chargeNurse,
      EMERGENCY_ROLE_IDS.edManager,
    ],
    whenToUse: 'When a patient needs transfer, specialist referral, or outbound handoff.',
    procedure: [
      {
        order: 1,
        action: 'Open Referrals from sidebar or patient panel',
        detail: 'Link referral to patient when possible.',
      },
      {
        order: 2,
        action: 'Document referral reason and urgency',
        detail: 'Staff-owned clinical decision.',
      },
      {
        order: 3,
        action: 'Track acceptance and delays',
        detail: 'Referral hub shows stalled outbound cases.',
      },
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
    whenToUse:
      'When you need department context, patient summary, or tool recommendations — not on reception desk.',
    procedure: [
      {
        order: 1,
        action: 'Open Copilot',
        detail: 'Sidebar, session chrome (C), header badge, or command palette.',
      },
      {
        order: 2,
        action: 'Select patient context if needed',
        detail: 'Select a patient on whiteboard first for patient-specific answers.',
      },
      {
        order: 3,
        action: 'Ask or use quick actions',
        detail: 'Summaries, reassessment signals, calculator launches.',
      },
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
      {
        order: 1,
        action: 'Open Medical Tools from sidebar',
        detail: 'Or command palette — type calculator name.',
      },
      {
        order: 2,
        action: 'Attach patient context when available',
        detail: 'Patient bar pre-fills demographics when selected.',
      },
      {
        order: 3,
        action: 'Run calculator and document result',
        detail: 'Staff records outcome in clinical workflow.',
      },
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
      {
        order: 1,
        action: 'Search from Patients screen or header lookup',
        detail: 'Ctrl/Cmd+K also searches operational entities.',
      },
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
    roles: [
      EMERGENCY_ROLE_IDS.chargeNurse,
      EMERGENCY_ROLE_IDS.edManager,
      EMERGENCY_ROLE_IDS.triageNurse,
    ],
    whenToUse: 'Charge nurse flow huddles and bottleneck identification.',
    procedure: [
      {
        order: 1,
        action: 'Review queue list and breach indicators',
        detail: 'Compare with whiteboard filters.',
      },
      {
        order: 2,
        action: 'Coordinate moves with charge nurse actions',
        detail: 'Queue moves require appropriate role.',
      },
    ],
    relatedTopicIds: ['whiteboard', 'capacity'],
  },
  {
    id: 'pulse',
    title: 'Department Pulse',
    eyebrow: 'Real-time · situational awareness',
    purpose: 'Live department pulse metrics for charge nurse and manager huddles.',
    route: CANONICAL_ROUTES.emergencyPulse,
    roles: [
      EMERGENCY_ROLE_IDS.chargeNurse,
      EMERGENCY_ROLE_IDS.edManager,
      EMERGENCY_ROLE_IDS.registrationClerk,
    ],
    whenToUse: 'Quick operational snapshot without opening full analytics.',
    procedure: [
      {
        order: 1,
        action: 'Open Pulse from utility section of sidebar',
        detail: 'Available to most clinical roles in pilot.',
      },
      {
        order: 2,
        action: 'Use with Whiteboard for action',
        detail: 'Pulse shows status; whiteboard is where you act.',
      },
    ],
    relatedTopicIds: ['analytics', 'whiteboard'],
  },
  {
    id: 'shift',
    title: 'Shift summary',
    eyebrow: 'Handoff · end of shift',
    purpose: 'Shift-level summary and handoff notes for nursing and operations.',
    route: CANONICAL_ROUTES.emergencyShift,
    roles: [
      EMERGENCY_ROLE_IDS.chargeNurse,
      EMERGENCY_ROLE_IDS.edManager,
      EMERGENCY_ROLE_IDS.registrationClerk,
    ],
    whenToUse: 'End of shift or mid-shift handoff between charge roles.',
    procedure: [
      {
        order: 1,
        action: 'Review open patients and breaches',
        detail: 'Cross-check with whiteboard before handoff.',
      },
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
      {
        order: 1,
        action: 'Open Analytics from sidebar',
        detail: 'ED manager has full view; charge nurse scoped view.',
      },
      {
        order: 2,
        action: 'Compare with live Pulse and Whiteboard',
        detail: 'Analytics is retrospective; board is live.',
      },
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
      {
        order: 1,
        action: 'Load walkthrough dataset',
        detail: 'Populates whiteboard for training demos.',
      },
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
      {
        order: 1,
        action: 'Open from whiteboard card or search',
        detail: 'Panel slides over main content.',
      },
      {
        order: 2,
        action: 'Review journey and flags',
        detail: 'See queue history and active alerts.',
      },
      { order: 3, action: 'Document vitals and notes', detail: 'Role-gated write actions.' },
      {
        order: 4,
        action: 'Launch copilot or tools from panel',
        detail: 'Patient context carries forward.',
      },
    ],
    relatedTopicIds: ['whiteboard', 'copilot', 'tools'],
  },
  {
    id: 'intake',
    title: 'Smart Intake (embedded)',
    eyebrow: 'Registration · demographics',
    purpose:
      'Collect demographics and chief complaint — usually launched from Reception, not standalone nav.',
    route: CANONICAL_ROUTES.emergencyIntake,
    roles: [EMERGENCY_ROLE_IDS.registrationClerk, EMERGENCY_ROLE_IDS.triageNurse],
    whenToUse: 'Register walk-in, express registration, or embedded intake from reception queues.',
    procedure: [
      {
        order: 1,
        action: 'Start from Reception action buttons',
        detail: 'Register walk-in or ?intake=1 on reception URL.',
      },
      {
        order: 2,
        action: 'Complete demographics and complaint',
        detail: 'Verification step when required.',
      },
      {
        order: 3,
        action: 'Submit to pretriage queue',
        detail: 'Patient card appears on whiteboard after handoff.',
      },
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
  {
    id: 'documentation',
    title: 'Clinical Documentation Assistant',
    eyebrow: 'Ambient scribe · AI-assisted notes',
    purpose:
      'Generate AI-drafted clinical notes from patient context, vitals, and chief complaint — reviewed and signed by the clinician.',
    route: CANONICAL_ROUTES.emergencyDocumentation,
    roles: [
      EMERGENCY_ROLE_IDS.physician,
      EMERGENCY_ROLE_IDS.chargeNurse,
      EMERGENCY_ROLE_IDS.triageNurse,
    ],
    whenToUse:
      'After assessment or at any point a clinical note is needed. Open from the patient card or directly from the sidebar.',
    procedure: [
      {
        order: 1,
        action: 'Open from patient card or sidebar',
        detail: 'Patient context is pre-loaded — name, chief complaint, acuity, vitals.',
      },
      {
        order: 2,
        action: 'Select note type',
        detail: 'Triage note, assessment note, progress note, or discharge summary.',
      },
      {
        order: 3,
        action: 'Review AI draft',
        detail: 'AI generates a structured note from patient data. Review each section carefully.',
      },
      {
        order: 4,
        action: 'Edit and sign',
        detail:
          'Modify any section as needed. Your signature finalises the note and adds it to the audit log.',
      },
    ],
    tips: [
      'AI draft is a starting point — always review before signing.',
      'Vitals entered at triage are pre-populated into the note template.',
      'Shortcut: open from patient detail panel → "Document" action.',
    ],
    relatedTopicIds: ['patient-detail', 'copilot', 'whiteboard'],
    notFor: 'Registration Clerk — documentation is a clinical function.',
  },
  {
    id: 'self-arrival',
    title: 'Self-Arrival Check-in Kiosk',
    eyebrow: 'Kiosk · low-acuity intake',
    purpose:
      'Allow low-acuity patients to self-register their arrival on a tablet or kiosk, reducing reception workload during high-volume periods.',
    route: CANONICAL_ROUTES.emergencySelfArrival,
    roles: [
      EMERGENCY_ROLE_IDS.registrationClerk,
      EMERGENCY_ROLE_IDS.triageNurse,
      EMERGENCY_ROLE_IDS.admin,
      EMERGENCY_ROLE_IDS.edManager,
    ],
    whenToUse:
      'Enable on tablets at reception during high-volume periods or for clearly low-acuity walk-in patients.',
    procedure: [
      {
        order: 1,
        action: 'Patient completes self-registration',
        detail: 'Name, DOB, chief complaint, contact number.',
      },
      {
        order: 2,
        action: 'AI triages chief complaint urgency',
        detail:
          'Low-acuity complaints proceed; potential high-acuity routes to reception for manual registration.',
      },
      {
        order: 3,
        action: 'Patient appears in Pretriage Queue',
        detail: 'Same as a reception-created record — triage nurse picks up normally.',
      },
    ],
    tips: [
      'High-acuity red-flag keywords trigger a redirect to the front desk.',
      'Self-arrival records are marked with a kiosk icon on the patient card.',
      'Not a replacement for reception — for ambiguous presentations, direct to desk.',
    ],
    relatedTopicIds: ['reception', 'intake'],
    notFor: 'Critical or unstable presentations — these must go through reception.',
  },
  {
    id: 'alerts',
    title: 'Clinical Alerts Center',
    eyebrow: 'Alerts · critical flags',
    purpose:
      'Central view of all active clinical alerts, critical flags, reassessment breaches, and system notifications across the department.',
    route: CANONICAL_ROUTES.emergencyAlerts,
    roles: [
      EMERGENCY_ROLE_IDS.physician,
      EMERGENCY_ROLE_IDS.chargeNurse,
      EMERGENCY_ROLE_IDS.triageNurse,
      EMERGENCY_ROLE_IDS.edManager,
      EMERGENCY_ROLE_IDS.admin,
    ],
    whenToUse:
      'When the Critical Alert Banner fires, or to review all pending alerts in one place. Charge nurses should check this at the start of every huddle.',
    procedure: [
      {
        order: 1,
        action: 'Open Alerts Center',
        detail: 'Accessible from sidebar or Critical Alert Banner → View all.',
      },
      {
        order: 2,
        action: 'Review active alerts by severity',
        detail: 'Critical (red) → High (orange) → Medium (yellow). Resolve in order.',
      },
      {
        order: 3,
        action: 'Acknowledge or escalate each alert',
        detail: 'Acknowledgment is logged with your name and timestamp.',
      },
      {
        order: 4,
        action: 'Dismiss resolved alerts',
        detail: 'Resolved alerts stay in log — never deleted.',
      },
    ],
    tips: [
      'Critical alerts must be acknowledged within 3 minutes — this is the 3-minute response target.',
      'At 0:30: charge nurse receives an awareness notification. At 2:00: alert escalates to charge nurse. At 3:00: breach fires to physician and patient flow coordinator.',
      'Filter by patient, alert type, or severity using the top toolbar.',
    ],
    relatedTopicIds: ['whiteboard', 'queues', 'reassessment'],
  },
  {
    id: 'patient-room',
    title: 'Patient Room Display',
    eyebrow: 'Room screen · bedside display',
    purpose:
      'Single-patient display optimised for a room-mounted screen — shows active patient status, next action, and care team.',
    route: CANONICAL_ROUTES.emergencyPatientRoom,
    roles: [
      EMERGENCY_ROLE_IDS.chargeNurse,
      EMERGENCY_ROLE_IDS.physician,
      EMERGENCY_ROLE_IDS.edManager,
      EMERGENCY_ROLE_IDS.readOnlyViewer,
    ],
    whenToUse:
      'Mount on a room display or tablet to show the patient and care team what is happening without exposing the full whiteboard.',
    procedure: [
      {
        order: 1,
        action: 'Open the patient card → "Room display" action',
        detail: 'Or navigate directly to /emergency/patient-room?patientId=<id>.',
      },
      {
        order: 2,
        action: 'Display auto-refreshes',
        detail: 'No interaction needed — screen updates as patient status changes.',
      },
      {
        order: 3,
        action: 'Care team and next step shown',
        detail: 'Assigned nurse, physician, acuity, and next scheduled reassessment.',
      },
    ],
    tips: [
      'PHI is displayed — ensure this screen is not visible in public corridors.',
      'Use Read-Only Viewer role for shared room displays to prevent unintended actions.',
    ],
    relatedTopicIds: ['whiteboard', 'patient-detail'],
    notFor: 'Reception area — use Public Waiting Display for patient-facing screens.',
  },
]);

export const MANUAL_RESPONSE_TOPICS: readonly ManualTopic[] = Object.freeze([
  {
    id: 'three-minute-response',
    title: '3-minute response procedure',
    eyebrow: 'Critical alert - first 3 minutes',
    purpose:
      'Capture red flags, notify the accountable role, route the patient, and escalate if no one acknowledges.',
    route: CANONICAL_ROUTES.emergencyAlerts,
    roles: Object.values(EMERGENCY_ROLE_IDS),
    whenToUse:
      'Any critical/high-risk patient, unacknowledged severe alert, deterioration signal, EMS red flag, or reassessment breach.',
    procedure: [
      {
        order: 1,
        action: '0:00 — timer starts automatically',
        detail:
          'A new critical alert triggers the 3-minute response engine. The assigned owner is the triage or registered nurse.',
      },
      {
        order: 2,
        action: '0:30 — awareness notification',
        detail:
          'Charge nurse receives an in-app awareness alert. No owner change yet — this is informational.',
      },
      {
        order: 3,
        action: '1:00-2:00 — confirm routing and handoff',
        detail: 'Charge nurse or physician routes the patient and confirms the escalation plan.',
      },
      {
        order: 4,
        action: '2:00 — escalation L1',
        detail:
          'Charge nurse becomes the accountable owner. A new critical alert fires to the charge nurse if the alert is still unacknowledged.',
      },
      {
        order: 5,
        action: '3:00 — BREACH',
        detail:
          'Alert escalates to ED physician and patient flow coordinator. Breach is recorded in analytics.',
      },
      {
        order: 6,
        action: '5:00 — extended breach',
        detail:
          'Hospital administrator receives notification. Breach duration is tracked until resolution.',
      },
      {
        order: 7,
        action: 'Acknowledge at any point',
        detail:
          'Click Acknowledge in the Alerts Center or patient panel. This stops the escalation chain and logs your name and timestamp.',
      },
    ],
    tips: [
      'The timer starts automatically when a Critical alert is dispatched — you do not need to start it manually.',
      'Acknowledging the alert stops the escalation chain immediately.',
      'Breach events appear in Analytics → 3-Minute Response for quality review.',
    ],
    relatedTopicIds: ['alerts', 'copilot', 'staff-routing'],
  },
  {
    id: 'staff-routing',
    title: 'Staff routing and assignment',
    eyebrow: 'Ownership - who acts next',
    purpose:
      'Assign accountable staff by role, department, load, availability, and alert ownership.',
    route: CANONICAL_ROUTES.emergencyShift,
    roles: [
      EMERGENCY_ROLE_IDS.chargeNurse,
      EMERGENCY_ROLE_IDS.physician,
      EMERGENCY_ROLE_IDS.edManager,
      'patient_flow_coordinator',
      'hospital_admin',
    ],
    whenToUse:
      'During surge, handoff, critical alert acknowledgement, patient movement, or staffing gaps.',
    procedure: [
      {
        order: 1,
        action: 'Confirm the patient owner',
        detail: 'Use the compiled CareDroid profile and assigned care team IDs.',
      },
      {
        order: 2,
        action: 'Check role capability',
        detail: 'Only users with staff assignment scope can reassign clinical ownership.',
      },
      {
        order: 3,
        action: 'Route to the least loaded available owner',
        detail: 'Prefer on-shift staff in the same department and hospital site.',
      },
      {
        order: 4,
        action: 'Escalate gaps',
        detail: 'If no owner is available, notify charge nurse and patient flow coordinator.',
      },
    ],
    relatedTopicIds: ['whiteboard', 'three-minute-response'],
  },
  {
    id: 'department-routing',
    title: 'Department routing',
    eyebrow: 'Destination - right service next',
    purpose:
      'Route patients to ED zones, labs, imaging, pharmacy, specialty consult, admission, or transfer.',
    route: CANONICAL_ROUTES.emergencyCapacity,
    roles: [
      EMERGENCY_ROLE_IDS.chargeNurse,
      EMERGENCY_ROLE_IDS.physician,
      EMERGENCY_ROLE_IDS.edManager,
      'patient_flow_coordinator',
    ],
    whenToUse:
      'After triage, at provider assessment, when diagnostics are needed, or when capacity changes.',
    procedure: [
      {
        order: 1,
        action: 'Review current patient status',
        detail: 'Acuity, complaint, vitals, alerts, orders, and wait time.',
      },
      {
        order: 2,
        action: 'Review bottlenecks',
        detail: 'Use Flow & Capacity and AI Chief bottleneck context before choosing destination.',
      },
      {
        order: 3,
        action: 'Select destination and owner',
        detail: 'Department routing must include a handoff owner and expected next action.',
      },
      {
        order: 4,
        action: 'Document exceptions',
        detail: 'Override AI suggestions only with a staff reason and audit trail.',
      },
    ],
    relatedTopicIds: ['capacity', 'referrals', 'copilot'],
  },
  {
    id: 'service-bottlenecks',
    title: 'Service bottleneck loop',
    eyebrow: 'Operations - slow service recovery',
    purpose:
      'Detect degraded services and convert them into dashboard, alert, AI Chief, analytics, and settings actions.',
    route: CANONICAL_ROUTES.emergencyAnalytics,
    roles: [
      EMERGENCY_ROLE_IDS.edManager,
      EMERGENCY_ROLE_IDS.admin,
      'it_admin',
      'quality_safety_officer',
      'patient_flow_coordinator',
    ],
    whenToUse:
      'When AI, auth, patient, triage, alerts, notifications, database, lab, radiology, pharmacy, analytics, reporting, EHR/FHIR, frontend, or performance signals degrade.',
    procedure: [
      {
        order: 1,
        action: 'Identify the affected service',
        detail: 'Use the bottleneck registry and service health indicators.',
      },
      {
        order: 2,
        action: 'Choose fallback action',
        detail: 'Continue manual care workflow while technical recovery proceeds.',
      },
      {
        order: 3,
        action: 'Notify impacted roles',
        detail:
          'Dashboard and Alerts show affected workflows; AI Chief explains safe alternatives.',
      },
      {
        order: 4,
        action: 'Track recovery and outcome',
        detail: 'Analytics records duration, affected patients, and operational impact.',
      },
    ],
    relatedTopicIds: ['analytics', 'settings', 'copilot'],
  },
  {
    id: 'downtime-fallback',
    title: 'Downtime and fallback procedure',
    eyebrow: 'Safety - AI unavailable',
    purpose: 'Continue safe ED operations when AI, integrations, or backend services are degraded.',
    route: CANONICAL_ROUTES.emergencyHelp,
    roles: Object.values(EMERGENCY_ROLE_IDS),
    whenToUse:
      'Any time a service banner, failed request, missing feed, or staff judgment says automation is unreliable.',
    procedure: [
      {
        order: 1,
        action: 'Keep clinical care moving',
        detail: 'Use standard hospital policy and licensed clinician judgment.',
      },
      {
        order: 2,
        action: 'Switch to manual documentation',
        detail: 'Record triage, reassessment, orders, and handoffs in approved downtime tools.',
      },
      {
        order: 3,
        action: 'Use phone, pager, or radio for critical alerts',
        detail: 'Do not wait for in-app notification delivery when patient safety is at risk.',
      },
      {
        order: 4,
        action: 'Back-enter only verified facts',
        detail: 'When systems recover, reconcile records with audit notes.',
      },
    ],
    relatedTopicIds: ['three-minute-response', 'service-bottlenecks'],
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
    canDo: [
      'Register walk-ins',
      'Verify identity',
      'Convert EMS arrivals',
      'Escalate to triage',
      'Search patients',
    ],
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
    canDo: [
      'Triage and acuity',
      'Vitals and flags',
      'Queue moves',
      'EMS handoff support',
      'Use Copilot',
    ],
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
    canDo: [
      'Flow control',
      'Staff and room assignment',
      'Reassessment oversight',
      'Capacity and boarding',
    ],
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
    canDo: [
      'Review patients',
      'Clinical notes',
      'Referrals',
      'Disposition',
      'Copilot and calculators',
    ],
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
  {
    roleId: EMERGENCY_ROLE_IDS.admin,
    label: EMERGENCY_ROLE_LABELS[EMERGENCY_ROLE_IDS.admin],
    startHere: CANONICAL_ROUTES.emergencyWhiteboard,
    primaryRoutes: [
      CANONICAL_ROUTES.emergencyWhiteboard,
      CANONICAL_ROUTES.emergencyAnalytics,
      CANONICAL_ROUTES.emergencySettings,
      CANONICAL_ROUTES.emergencyAlerts,
      CANONICAL_ROUTES.emergencyShift,
    ],
    canDo: [
      'Full platform access — all routes and all actions',
      'User and role management',
      'Configure ED thresholds and settings',
      'Review audit log and AI governance',
      'Load and reset demo data',
      'System health monitoring',
    ],
    cannotDo: [],
    dailyFlow: [
      'Check System Health → confirm all services green',
      'Review audit trail for any flagged access events',
      'Verify ED settings are configured for current shift',
      'Support charge nurse and ED manager on operational issues',
      'Review AI governance report weekly',
    ],
  },
  {
    roleId: 'registered_nurse',
    label: 'Registered Nurse',
    startHere: CANONICAL_ROUTES.emergencyWhiteboard,
    primaryRoutes: [
      CANONICAL_ROUTES.emergencyWhiteboard,
      CANONICAL_ROUTES.emergencyPatients,
      CANONICAL_ROUTES.emergencyReassessment,
      CANONICAL_ROUTES.emergencyAlerts,
    ],
    canDo: [
      'Update assigned patient status',
      'Acknowledge alerts',
      'Complete reassessments',
      'Use AI Chief request support',
    ],
    cannotDo: [
      'Assign triage acuity',
      'Override AI recommendations',
      'Discharge patients',
      'Manage settings',
    ],
    dailyFlow: [
      'Start on assigned patients',
      'Check alerts and reassessment timers',
      'Document bedside updates',
      'Escalate deterioration to charge nurse or physician',
    ],
  },
  {
    roleId: 'specialist',
    label: 'Specialist',
    startHere: CANONICAL_ROUTES.emergencyPatients,
    primaryRoutes: [
      CANONICAL_ROUTES.emergencyPatients,
      CANONICAL_ROUTES.emergencyReferrals,
      CANONICAL_ROUTES.emergencyTools,
      CANONICAL_ROUTES.emergencyCopilot,
    ],
    canDo: [
      'Review consult patients',
      'Write specialist recommendations',
      'Review AI Chief summaries',
      'Acknowledge assigned alerts',
    ],
    cannotDo: ['Run front desk intake', 'Manage ED staffing', 'Change system settings'],
    dailyFlow: [
      'Open referred patients',
      'Review handoff and diagnostics',
      'Document consult recommendation',
      'Close the loop with ED physician',
    ],
  },
  {
    roleId: 'patient_flow_coordinator',
    label: 'Patient Flow Coordinator',
    startHere: CANONICAL_ROUTES.emergencyCapacity,
    primaryRoutes: [
      CANONICAL_ROUTES.emergencyCapacity,
      CANONICAL_ROUTES.emergencyQueues,
      CANONICAL_ROUTES.emergencyAnalytics,
      CANONICAL_ROUTES.emergencyShift,
    ],
    canDo: [
      'Monitor bottlenecks',
      'Coordinate bed and department routing',
      'Escalate flow delays',
      'Assign non-clinical routing ownership',
    ],
    cannotDo: ['Diagnose or prescribe', 'Assign clinical acuity', 'Override clinician decisions'],
    dailyFlow: [
      'Review capacity and queue health',
      'Identify stalled patients',
      'Coordinate destination owners',
      'Feed unresolved delays to shift handoff',
    ],
  },
  {
    roleId: 'lab_technician',
    label: 'Lab Technician',
    startHere: CANONICAL_ROUTES.laboratory,
    primaryRoutes: [
      CANONICAL_ROUTES.laboratory,
      CANONICAL_ROUTES.emergencyAlerts,
      CANONICAL_ROUTES.emergencyHelp,
    ],
    canDo: [
      'View lab-related patient context',
      'Acknowledge lab workflow alerts',
      'Use downtime fallback steps',
    ],
    cannotDo: ['Edit clinical triage', 'Assign staff', 'Review AI recommendations as clinician'],
    dailyFlow: [
      'Open lab work queue',
      'Prioritize critical values',
      'Acknowledge lab alerts',
      'Notify ED owner by fallback channel when systems degrade',
    ],
  },
  {
    roleId: 'radiology_technician',
    label: 'Radiology Technician',
    startHere: CANONICAL_ROUTES.emergencyPatients,
    primaryRoutes: [
      CANONICAL_ROUTES.emergencyPatients,
      CANONICAL_ROUTES.emergencyAlerts,
      CANONICAL_ROUTES.emergencyHelp,
    ],
    canDo: [
      'View imaging-related context',
      'Acknowledge imaging workflow alerts',
      'Coordinate imaging readiness',
    ],
    cannotDo: ['Assign acuity', 'Order medications', 'Override AI recommendations'],
    dailyFlow: [
      'Review patients awaiting imaging',
      'Prioritize critical imaging requests',
      'Update imaging readiness',
      'Escalate unavailable imaging capacity',
    ],
  },
  {
    roleId: 'pharmacist',
    label: 'Pharmacist',
    startHere: CANONICAL_ROUTES.emergencyPatients,
    primaryRoutes: [
      CANONICAL_ROUTES.emergencyPatients,
      CANONICAL_ROUTES.emergencyAlerts,
      CANONICAL_ROUTES.emergencyTools,
      CANONICAL_ROUTES.emergencyCopilot,
    ],
    canDo: [
      'Review medication context',
      'Acknowledge medication alerts',
      'Use medication safety tools',
      'Escalate medication risk',
    ],
    cannotDo: ['Assign ED acuity', 'Discharge patients', 'Manage role settings'],
    dailyFlow: [
      'Check medication-related alerts',
      'Review patient medication context',
      'Document pharmacy recommendation',
      'Escalate high-risk medication issues',
    ],
  },
  {
    roleId: 'hospital_admin',
    label: 'Hospital Administrator',
    startHere: CANONICAL_ROUTES.emergencyAnalytics,
    primaryRoutes: [
      CANONICAL_ROUTES.emergencyAnalytics,
      CANONICAL_ROUTES.emergencyCapacity,
      CANONICAL_ROUTES.emergencyShift,
      CANONICAL_ROUTES.emergencySettings,
    ],
    canDo: [
      'Review operational performance',
      'Acknowledge operational alerts',
      'Review reports',
      'Manage hospital configuration',
    ],
    cannotDo: ['Perform clinical actions unless separately licensed and provisioned'],
    dailyFlow: [
      'Review command center metrics',
      'Inspect bottleneck loop',
      'Support surge decisions',
      'Review reports and settings',
    ],
  },
  {
    roleId: 'it_admin',
    label: 'IT Administrator',
    startHere: CANONICAL_ROUTES.emergencySettings,
    primaryRoutes: [
      CANONICAL_ROUTES.emergencySettings,
      CANONICAL_ROUTES.systemHealth,
      CANONICAL_ROUTES.audit,
      CANONICAL_ROUTES.emergencyHelp,
    ],
    canDo: [
      'Configure integrations',
      'Review audit/system health',
      'Manage users',
      'Support downtime recovery',
    ],
    cannotDo: [
      'View more clinical detail than metadata policy allows',
      'Perform patient care actions',
    ],
    dailyFlow: [
      'Check system health',
      'Review integration bottlenecks',
      'Support failed auth or notification paths',
      'Coordinate recovery with operations',
    ],
  },
  {
    roleId: 'quality_safety_officer',
    label: 'Quality & Safety Officer',
    startHere: CANONICAL_ROUTES.emergencyAnalytics,
    primaryRoutes: [
      CANONICAL_ROUTES.emergencyAnalytics,
      CANONICAL_ROUTES.audit,
      CANONICAL_ROUTES.emergencyAlerts,
      CANONICAL_ROUTES.emergencyHelp,
    ],
    canDo: [
      'Review 3-minute breaches',
      'Audit alerts and AI review',
      'Export reports',
      'Inspect safety trends',
    ],
    cannotDo: ['Mutate active patient care', 'Assign clinical owners'],
    dailyFlow: [
      'Review critical alert breaches',
      'Inspect AI override and review logs',
      'Track bottleneck outcomes',
      'Prepare safety reports',
    ],
  },
  {
    roleId: EMERGENCY_ROLE_IDS.dispatcher,
    label: EMERGENCY_ROLE_LABELS[EMERGENCY_ROLE_IDS.dispatcher],
    startHere: CANONICAL_ROUTES.emergencyDispatch,
    primaryRoutes: [
      CANONICAL_ROUTES.emergencyDispatch,
      CANONICAL_ROUTES.emergencyEms,
      CANONICAL_ROUTES.emergencyAlerts,
      CANONICAL_ROUTES.emergencyHelp,
    ],
    canDo: [
      'Log 911 calls and assign call priority',
      'Issue pre-arrival instructions to callers',
      'Dispatch EMS units (ALS/BLS)',
      'Track unit status from dispatch through hospital arrival',
      'Trigger ED pre-arrival notifications for Echo/Delta patients',
    ],
    cannotDo: [
      'Make clinical diagnoses or treatment decisions',
      'Assign triage acuity inside the ED',
      'Override licensed clinician decisions',
    ],
    dailyFlow: [
      'Open Dispatch Console at shift start',
      'Log all incoming calls immediately',
      'Assign and update EMS unit status',
      'For Echo/Delta: notify ED before unit arrives',
      'Close calls when patient is confirmed at hospital',
    ],
  },
  {
    roleId: EMERGENCY_ROLE_IDS.emsCoordinator,
    label: EMERGENCY_ROLE_LABELS[EMERGENCY_ROLE_IDS.emsCoordinator],
    startHere: CANONICAL_ROUTES.emergencyEms,
    primaryRoutes: [
      CANONICAL_ROUTES.emergencyDispatch,
      CANONICAL_ROUTES.emergencyEms,
      CANONICAL_ROUTES.emergencyEdReadiness,
      CANONICAL_ROUTES.emergencyCapacity,
      CANONICAL_ROUTES.emergencyAlerts,
      CANONICAL_ROUTES.emergencyHelp,
    ],
    canDo: [
      'Coordinate EMS unit deployment and prehospital data relay',
      'Submit pre-arrival MIST/SBAR notifications to the ED',
      'Activate ED Readiness Plans for inbound critical patients',
      'Monitor unit status from dispatch through handoff',
      'View department capacity and bottlenecks',
    ],
    cannotDo: [
      'Make clinical diagnoses or treatment decisions',
      'Authorize resource activations without a licensed clinician',
      'Override ED triage or disposition decisions',
    ],
    dailyFlow: [
      'Review active EMS units and ETAs at shift start',
      'Monitor inbound critical patients via EMS screen',
      'Submit pre-arrival notifications for Echo/Delta patients',
      'Confirm ED readiness plan is active before arrival',
      'Oversee handoff completion and offload times',
    ],
  },
  {
    roleId: 'demo_observer',
    label: 'Demo Observer',
    startHere: CANONICAL_ROUTES.emergencyWhiteboard,
    primaryRoutes: [
      CANONICAL_ROUTES.emergencyWhiteboard,
      CANONICAL_ROUTES.emergencyAlerts,
      CANONICAL_ROUTES.emergencyAnalytics,
      CANONICAL_ROUTES.emergencyHelp,
    ],
    canDo: ['View demo workflows', 'Open the manual', 'Follow guided walkthroughs'],
    cannotDo: ['Edit patients', 'Acknowledge production alerts', 'Override AI', 'Change settings'],
    dailyFlow: [
      'Open Help and follow the demo journey',
      'View the command center',
      'Observe alerts and analytics',
      'Switch roles only through demo controls',
    ],
  },
]);

export const MANUAL_SHORTCUTS = Object.freeze([
  { keys: '?', action: 'Open this Guide' },
  { keys: 'Ctrl/Cmd + K', action: 'Command palette — search patients, routes, actions' },
  { keys: 'C', action: 'Toggle CareDroid Copilot (when permitted)' },
  { keys: 'R', action: 'Reassessment drawer (charge / triage / physician)' },
  { keys: 'N', action: 'New patient — routes to reception create path' },
  { keys: 'D', action: 'Open Clinical Documentation Assistant (physician / charge nurse)' },
  { keys: 'A', action: 'Open Alerts Center' },
  { keys: 'Shift + H', action: 'Go to your role home screen' },
  { keys: 'Shift + W', action: 'Go to Whiteboard' },
  { keys: 'Shift + P', action: 'Go to Department Pulse' },
  { keys: 'Escape', action: 'Close panels — copilot, patient, palette' },
  { keys: '/', action: 'Focus reception search (on Reception) or open palette' },
]);

export const MANUAL_ALL_TOPICS: readonly ManualTopic[] = Object.freeze([
  ...MANUAL_TOPICS,
  ...MANUAL_RESPONSE_TOPICS,
]);

const TOPIC_BY_ID = new Map(MANUAL_ALL_TOPICS.map((t) => [t.id, t]));

export function getManualTopicById(id: string): ManualTopic | undefined {
  return TOPIC_BY_ID.get(id);
}

export function resolveManualTopicForPath(pathname: string): ManualTopic | undefined {
  const normalized = pathname.split('?')[0];
  const routeTopicId = getRouteByPath(normalized)?.helpTopicId;
  if (routeTopicId) {
    const routeTopic = getManualTopicById(routeTopicId);
    if (routeTopic) return routeTopic;
  }
  const exact = MANUAL_ALL_TOPICS.find((t) => t.route === normalized);
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
  return MANUAL_ALL_TOPICS.find((t) => normalized.startsWith(t.route));
}

export function resolveRolePlaybook(roleId: string): RolePlaybook | undefined {
  return MANUAL_ROLE_PLAYBOOKS.find((p) => p.roleId === roleId);
}

export function listTopicsForRole(roleId: string): ManualTopic[] {
  return MANUAL_ALL_TOPICS.filter(
    (t) => t.roles.includes(roleId) || t.roles.length === Object.values(EMERGENCY_ROLE_IDS).length,
  );
}

export { DEMO_JOURNEY_STEPS as MANUAL_DEMO_JOURNEY };
