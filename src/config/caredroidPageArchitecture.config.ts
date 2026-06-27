import { CANONICAL_ROUTES } from './routes.config';

export const CARE_DROID_PAGE_ROLES = Object.freeze({
  admin: 'admin',
  doctor: 'physician',
  nurse: 'charge_nurse',
  triageNurse: 'triage_nurse',
  reception: 'registration_clerk',
  manager: 'ed_manager',
});

export const CARE_DROID_PAGE_ARCHITECTURE = Object.freeze([
  {
    id: 'command-center',
    label: 'Command Center',
    path: CANONICAL_ROUTES.dashboard,
    targetPath: CANONICAL_ROUTES.emergencyWhiteboard,
    icon: 'activity',
    roles: [
      CARE_DROID_PAGE_ROLES.admin,
      CARE_DROID_PAGE_ROLES.doctor,
      CARE_DROID_PAGE_ROLES.nurse,
      CARE_DROID_PAGE_ROLES.triageNurse,
      CARE_DROID_PAGE_ROLES.reception,
      CARE_DROID_PAGE_ROLES.manager,
    ],
    priority: 1,
    purpose:
      'Real-time hospital overview, critical alerts, 3-minute response timers, AI Chief recommendations, staffing, capacity, and patient flow.',
    workflow: 'critical-alerts',
  },
  {
    id: 'intake',
    label: 'Intake',
    path: CANONICAL_ROUTES.intake,
    targetPath: CANONICAL_ROUTES.emergencyIntake,
    icon: 'intake',
    roles: [CARE_DROID_PAGE_ROLES.reception, CARE_DROID_PAGE_ROLES.nurse, CARE_DROID_PAGE_ROLES.triageNurse],
    priority: 2,
    purpose:
      'Register new patients, capture symptoms, insurance, consent, documents, and trigger AI intake assistance.',
    workflow: 'patient-journey',
  },
  {
    id: 'queue',
    label: 'Queue',
    path: CANONICAL_ROUTES.queue,
    targetPath: CANONICAL_ROUTES.emergencyQueues,
    icon: 'queues',
    roles: [
      CARE_DROID_PAGE_ROLES.admin,
      CARE_DROID_PAGE_ROLES.doctor,
      CARE_DROID_PAGE_ROLES.nurse,
      CARE_DROID_PAGE_ROLES.triageNurse,
      CARE_DROID_PAGE_ROLES.reception,
      CARE_DROID_PAGE_ROLES.manager,
    ],
    priority: 3,
    purpose:
      'Show all waiting and active patients by priority, triage status, department, estimated wait, and escalation state.',
    workflow: 'patient-journey',
  },
  {
    id: 'triage',
    label: 'Triage',
    path: CANONICAL_ROUTES.triage,
    targetPath: `${CANONICAL_ROUTES.emergencyQueues}?queue=pretriage`,
    icon: 'stethoscope',
    roles: [CARE_DROID_PAGE_ROLES.triageNurse, CARE_DROID_PAGE_ROLES.nurse, CARE_DROID_PAGE_ROLES.doctor],
    priority: 4,
    purpose:
      'Nurse triage workspace with vitals, red flags, AI triage recommendation, acuity support, clinician override, and response timer.',
    workflow: 'patient-journey',
  },
  {
    id: 'alerts',
    label: 'Alerts',
    path: CANONICAL_ROUTES.alerts,
    targetPath: CANONICAL_ROUTES.emergencyAlerts,
    icon: 'alerts',
    roles: [
      CARE_DROID_PAGE_ROLES.admin,
      CARE_DROID_PAGE_ROLES.doctor,
      CARE_DROID_PAGE_ROLES.nurse,
      CARE_DROID_PAGE_ROLES.triageNurse,
      CARE_DROID_PAGE_ROLES.manager,
    ],
    priority: 5,
    purpose:
      'Manage critical alerts, acknowledgements, escalation status, owners, severity, and 3-minute response compliance.',
    workflow: 'critical-alerts',
  },
  {
    id: 'ai-chief',
    label: 'AI Chief',
    path: CANONICAL_ROUTES.aiChief,
    targetPath: CANONICAL_ROUTES.emergencyCopilot,
    icon: 'ed-copilot',
    roles: [
      CARE_DROID_PAGE_ROLES.admin,
      CARE_DROID_PAGE_ROLES.doctor,
      CARE_DROID_PAGE_ROLES.nurse,
      CARE_DROID_PAGE_ROLES.triageNurse,
      CARE_DROID_PAGE_ROLES.manager,
    ],
    priority: 6,
    purpose:
      'Central AI command view showing recommendations, operational insights, triage support history, and safety review state.',
    workflow: 'ai-journey',
  },
  {
    id: 'staff',
    label: 'Staff',
    path: CANONICAL_ROUTES.staff,
    targetPath: `${CANONICAL_ROUTES.adminOperations}/team`,
    icon: 'users',
    roles: [CARE_DROID_PAGE_ROLES.admin, CARE_DROID_PAGE_ROLES.manager],
    priority: 7,
    purpose:
      'Doctors on duty, nurses available, workload, department assignment, staffing risks, and AI resource insights.',
    workflow: 'critical-alerts',
  },
  {
    id: 'departments',
    label: 'Departments',
    path: CANONICAL_ROUTES.departments,
    targetPath: CANONICAL_ROUTES.emergencyCapacity,
    icon: 'capacity',
    roles: [
      CARE_DROID_PAGE_ROLES.admin,
      CARE_DROID_PAGE_ROLES.doctor,
      CARE_DROID_PAGE_ROLES.nurse,
      CARE_DROID_PAGE_ROLES.triageNurse,
      CARE_DROID_PAGE_ROLES.manager,
    ],
    priority: 8,
    purpose:
      'Department capacity, queue length, average wait, staffing, bed availability, and bottlenecks.',
    workflow: 'patient-journey',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    path: CANONICAL_ROUTES.analytics,
    targetPath: CANONICAL_ROUTES.emergencyAnalytics,
    icon: 'emergency-analytics',
    roles: [CARE_DROID_PAGE_ROLES.admin, CARE_DROID_PAGE_ROLES.manager],
    priority: 9,
    purpose:
      'Wait time trends, triage time, throughput, occupancy, staffing utilization, bottleneck analysis, and operational KPIs.',
    workflow: 'critical-alerts',
  },
  {
    id: 'reports',
    label: 'Reports',
    path: CANONICAL_ROUTES.reports,
    targetPath: CANONICAL_ROUTES.emergencyAnalytics,
    icon: 'report',
    roles: [CARE_DROID_PAGE_ROLES.admin, CARE_DROID_PAGE_ROLES.manager],
    priority: 10,
    purpose:
      'Exportable operational summaries, daily performance, triage outcomes, and hospital efficiency reports.',
    workflow: 'critical-alerts',
  },
  {
    id: 'settings',
    label: 'Settings',
    path: CANONICAL_ROUTES.settings,
    targetPath: CANONICAL_ROUTES.emergencySettings,
    icon: 'settings',
    roles: [CARE_DROID_PAGE_ROLES.admin, CARE_DROID_PAGE_ROLES.manager],
    priority: 11,
    purpose:
      'Hospital configuration, users, roles, departments, AI safety settings, escalation rules, and notification preferences.',
    workflow: 'ai-journey',
  },
]);

export const CARE_DROID_PATIENT_PROFILE_PAGE = Object.freeze({
  id: 'patient-profile',
  label: 'Patient Profile',
  path: CANONICAL_ROUTES.patientProfile,
  targetPath: CANONICAL_ROUTES.emergencyPatients,
  purpose:
    'Single source of truth for patient summary, timeline, vitals, red flags, assigned staff, AI summary, handoff, and next action.',
  workflow: 'patient-journey',
});

export const CARE_DROID_WORKFLOW_MAP = Object.freeze({
  patientJourney: Object.freeze([
    'Patient arrives',
    'Intake',
    'Queue',
    'Triage',
    'Patient profile',
    'Department assignment',
    'Treatment workflow',
    'Discharge and reporting',
  ]),
  criticalAlertJourney: Object.freeze([
    'Alert generated',
    'Dashboard banner',
    'Alerts page',
    'AI Chief recommendation',
    'Assigned staff',
    'Acknowledgement',
    'Escalation if delayed',
    'Patient profile update',
    'Analytics and reporting',
  ]),
  aiJourney: Object.freeze([
    'Clinical or operational event',
    'Frontend hook/client',
    'Centralized AI node',
    'Structured AI response',
    'Reusable AI UI component',
    'Clinician review',
    'Accepted, modified, dismissed, or escalated action',
    'Audit trail when supported',
  ]),
});

export const CARE_DROID_LAYOUT_COMPONENTS = Object.freeze([
  'AppShell',
  'Sidebar',
  'Header',
  'PageHeader',
  'DashboardGrid',
  'MetricGrid',
  'DashboardSection',
  'PageShell',
  'OperationalEmptyState',
  'EmptyState',
  'ErrorState',
  'LoadingState',
]);
