/**
 * Page-by-page rebuild backlog — reverse-engineered from patient journey order.
 * One canonical path per surface; aliases redirect (see ED_CANONICAL_ROUTE_ALIASES).
 */
import { CANONICAL_ROUTES } from './routes.config';
import { CARE_DROID_PAGE_ARCHITECTURE } from './caredroidPageArchitecture.config';
import {
  DEFAULT_ED_PAGE_UX_CONTRACT,
  ENTRY_HUB_UX_CONTRACT,
  PAGE_REBUILD_STATUS,
  PUBLIC_DISPLAY_UX_CONTRACT,
  type PageRebuildStatus,
  type PageUxContract,
} from './pageUxContract';

export type PageRebuildWave = Readonly<{
  id: string;
  label: string;
  description: string;
}>;

export type PageRebuildEntry = Readonly<{
  id: string;
  label: string;
  path: string;
  componentKey: string;
  waveId: string;
  journeyPhase: string;
  ownerRole: string;
  purpose: string;
  status: PageRebuildStatus;
  uxContract: PageUxContract;
  /** Pilot-customer nav visibility */
  pilotNav: boolean;
}>;

export const PAGE_REBUILD_WAVES: readonly PageRebuildWave[] = Object.freeze([
  Object.freeze({
    id: 'wave-0-entry',
    label: 'Entry & orientation',
    description: 'Platform hub, role selection, and public display surfaces.',
  }),
  Object.freeze({
    id: 'wave-1-prearrival',
    label: 'Pre-arrival',
    description: 'Dispatch, EMS pipeline, and ED readiness before patient arrival.',
  }),
  Object.freeze({
    id: 'wave-2-arrival',
    label: 'Arrival & intake',
    description: 'Reception desk, smart intake, and self check-in.',
  }),
  Object.freeze({
    id: 'wave-3-command',
    label: 'Command & flow',
    description: 'Command center, whiteboard, triage, queues, and reassessment.',
  }),
  Object.freeze({
    id: 'wave-4-clinical',
    label: 'Clinical care',
    description: 'Patients, profile, alerts, diagnostics, copilot, and documentation.',
  }),
  Object.freeze({
    id: 'wave-5-disposition',
    label: 'Disposition',
    description: 'Referrals, handoffs, capacity, and boarding.',
  }),
  Object.freeze({
    id: 'wave-6-reporting',
    label: 'Reporting & pulse',
    description: 'Department pulse, shift summary, analytics, and reports.',
  }),
  Object.freeze({
    id: 'wave-7-platform',
    label: 'Platform & admin',
    description: 'Settings, help, profile, and admin console.',
  }),
  Object.freeze({
    id: 'wave-8-consoles',
    label: 'Extension consoles',
    description: 'Tools, governance, fleet, platform intelligence, and training.',
  }),
]);

const W = PAGE_REBUILD_WAVES.reduce(
  (acc, wave) => ({ ...acc, [wave.id]: wave.id }),
  {} as Record<string, string>,
);

function edEntry(
  partial: Omit<PageRebuildEntry, 'uxContract' | 'status'> & {
    status?: PageRebuildStatus;
    uxContract?: PageUxContract;
  },
): PageRebuildEntry {
  return Object.freeze({
    status: PAGE_REBUILD_STATUS.pending,
    uxContract: DEFAULT_ED_PAGE_UX_CONTRACT,
    pilotNav: true,
    ...partial,
  });
}

/** Architecture-driven ED pages (priorities 1–16) */
const architectureEntries: PageRebuildEntry[] = CARE_DROID_PAGE_ARCHITECTURE.map((page) => {
  const waveById: Record<string, string> = {
    dispatch: W['wave-1-prearrival'],
    ems: W['wave-1-prearrival'],
    'ed-readiness': W['wave-1-prearrival'],
    reception: W['wave-2-arrival'],
    'command-center': W['wave-3-command'],
    whiteboard: W['wave-3-command'],
    triage: W['wave-3-command'],
    alerts: W['wave-4-clinical'],
    diagnostics: W['wave-4-clinical'],
    copilot: W['wave-4-clinical'],
    referrals: W['wave-5-disposition'],
    handoffs: W['wave-5-disposition'],
    capacity: W['wave-5-disposition'],
    analytics: W['wave-6-reporting'],
    reports: W['wave-6-reporting'],
    settings: W['wave-7-platform'],
  };

  return edEntry({
    id: page.id,
    label: page.label,
    path: page.targetPath,
    componentKey: page.id,
    waveId: waveById[page.id] || W['wave-3-command'],
    journeyPhase: page.journeyPhase,
    ownerRole: page.ownerRole,
    purpose: page.purpose,
    pilotNav: true,
  });
});

const REBUILD_STATUS_OVERRIDES: Partial<Record<string, PageRebuildStatus>> = Object.freeze({
  'platform-entry-hub': PAGE_REBUILD_STATUS.rebuilt,
  'command-center': PAGE_REBUILD_STATUS.rebuilt,
  alerts: PAGE_REBUILD_STATUS.rebuilt,
  reception: PAGE_REBUILD_STATUS.rebuilt,
  dispatch: PAGE_REBUILD_STATUS.rebuilt,
  'public-waiting-display': PAGE_REBUILD_STATUS.rebuilt,
  queues: PAGE_REBUILD_STATUS.rebuilt,
  ems: PAGE_REBUILD_STATUS.rebuilt,
  triage: PAGE_REBUILD_STATUS.rebuilt,
  patients: PAGE_REBUILD_STATUS.rebuilt,
  'ed-readiness': PAGE_REBUILD_STATUS.rebuilt,
  whiteboard: PAGE_REBUILD_STATUS.rebuilt,
  settings: PAGE_REBUILD_STATUS.rebuilt,
  diagnostics: PAGE_REBUILD_STATUS.rebuilt,
  handoffs: PAGE_REBUILD_STATUS.rebuilt,
  reports: PAGE_REBUILD_STATUS.rebuilt,
  pulse: PAGE_REBUILD_STATUS.rebuilt,
  shift: PAGE_REBUILD_STATUS.rebuilt,
});

function applyRebuildStatus(entry: PageRebuildEntry): PageRebuildEntry {
  const override = REBUILD_STATUS_OVERRIDES[entry.id];
  if (!override || override === entry.status) return entry;
  return Object.freeze({ ...entry, status: override });
}

export const PAGE_REBUILD_REGISTRY: readonly PageRebuildEntry[] = Object.freeze(
  [
  Object.freeze({
    id: 'platform-entry-hub',
    label: 'Platform Entry Hub',
    path: CANONICAL_ROUTES.platformStart,
    componentKey: 'PlatformEntryHub',
    waveId: W['wave-0-entry'],
    journeyPhase: 'orientation',
    ownerRole: 'All roles',
    purpose: 'Choose demo entry, clinical workspace, or admin console.',
    status: PAGE_REBUILD_STATUS.rebuilt,
    uxContract: ENTRY_HUB_UX_CONTRACT,
    pilotNav: false,
  }),
  Object.freeze({
    id: 'public-waiting-display',
    label: 'Public Waiting Display',
    path: '/display/whiteboard',
    componentKey: 'WhiteboardDisplayRoute',
    waveId: W['wave-0-entry'],
    journeyPhase: 'waiting',
    ownerRole: 'Public display',
    purpose: 'PHI-safe waiting-room wall — wait ranges, crowd level, care stages.',
    status: PAGE_REBUILD_STATUS.rebuilt,
    uxContract: PUBLIC_DISPLAY_UX_CONTRACT,
    pilotNav: false,
  }),
  ...architectureEntries,
  edEntry({
    id: 'patient-profile',
    label: 'Patient Profile',
    path: CANONICAL_ROUTES.patientProfile,
    componentKey: 'PatientProfileRoute',
    waveId: W['wave-4-clinical'],
    journeyPhase: 'triage-assessment',
    ownerRole: 'Care team',
    purpose: 'Patient summary, timeline, vitals, flags, AI summary, and next action.',
    pilotNav: false,
  }),
  edEntry({
    id: 'queues',
    label: 'Queues',
    path: CANONICAL_ROUTES.emergencyQueues,
    componentKey: 'QueueRoute',
    waveId: W['wave-3-command'],
    journeyPhase: 'triage-assessment',
    ownerRole: 'Charge nurse',
    purpose: 'Waiting, triage, reassessment, and treatment queue coordination.',
  }),
  edEntry({
    id: 'reassessment',
    label: 'Reassessment',
    path: CANONICAL_ROUTES.emergencyReassessment,
    componentKey: 'ReassessmentRoute',
    waveId: W['wave-3-command'],
    journeyPhase: 'triage-assessment',
    ownerRole: 'Nursing',
    purpose: 'Reassessment timers and overdue clinical review.',
  }),
  edEntry({
    id: 'boarding',
    label: 'Boarding',
    path: CANONICAL_ROUTES.emergencyBoarding,
    componentKey: 'BoardingRoute',
    waveId: W['wave-5-disposition'],
    journeyPhase: 'disposition-handoff',
    ownerRole: 'Patient flow coordinator',
    purpose: 'Inpatient boarding pressure and bed wait coordination.',
  }),
  edEntry({
    id: 'documentation',
    label: 'Clinical Documentation',
    path: CANONICAL_ROUTES.emergencyDocumentation,
    componentKey: 'ClinicalDocumentationAssistant',
    waveId: W['wave-4-clinical'],
    journeyPhase: 'diagnostics-treatment',
    ownerRole: 'Physician',
    purpose: 'AI-assisted clinical notes with clinician review and sign.',
    pilotNav: false,
  }),
  edEntry({
    id: 'medical-tools',
    label: 'Medical Tools',
    path: CANONICAL_ROUTES.emergencyTools,
    componentKey: 'ToolsOverview',
    waveId: W['wave-8-consoles'],
    journeyPhase: 'diagnostics-treatment',
    ownerRole: 'Clinical team',
    purpose: 'Calculators, protocols, and clinical decision support tools.',
  }),
  edEntry({
    id: 'pulse',
    label: 'Department Pulse',
    path: CANONICAL_ROUTES.emergencyPulse,
    componentKey: 'EmergencyDepartmentPulse',
    waveId: W['wave-6-reporting'],
    journeyPhase: 'reporting-analytics',
    ownerRole: 'ED operations',
    purpose: 'Live ED pulse and status summary.',
  }),
  edEntry({
    id: 'shift',
    label: 'Shift Summary',
    path: CANONICAL_ROUTES.emergencyShift,
    componentKey: 'EmergencyShiftSummary',
    waveId: W['wave-6-reporting'],
    journeyPhase: 'disposition-handoff',
    ownerRole: 'Charge nurse',
    purpose: 'Shift summary and handoff readiness.',
  }),
  edEntry({
    id: 'help',
    label: 'Help Hub',
    path: CANONICAL_ROUTES.emergencyHelp,
    componentKey: 'HelpHubPage',
    waveId: W['wave-7-platform'],
    journeyPhase: 'orientation',
    ownerRole: 'All roles',
    purpose: 'Route-aware and role-aware user manual.',
  }),
  edEntry({
    id: 'admin-console',
    label: 'Admin Console',
    path: CANONICAL_ROUTES.adminOperations,
    componentKey: 'AdminOperationsShell',
    waveId: W['wave-7-platform'],
    journeyPhase: 'platform-admin',
    ownerRole: 'Hospital administrator',
    purpose: 'Staff workflows, tenant settings, and audit views.',
    pilotNav: true,
  }),
  edEntry({
    id: 'patient-room-display',
    label: 'Patient Room Display',
    path: CANONICAL_ROUTES.emergencyPatientRoom,
    componentKey: 'PatientRoomDisplay',
    waveId: W['wave-0-entry'],
    journeyPhase: 'diagnostics-treatment',
    ownerRole: 'In-room display',
    purpose: 'In-room patient whiteboard and door sign.',
    uxContract: PUBLIC_DISPLAY_UX_CONTRACT,
    pilotNav: false,
  }),
  ].map(applyRebuildStatus),
);

const registryById = Object.freeze(
  Object.fromEntries(PAGE_REBUILD_REGISTRY.map((entry) => [entry.id, entry])),
);

const registryByPath = Object.freeze(
  Object.fromEntries(PAGE_REBUILD_REGISTRY.map((entry) => [entry.path, entry])),
);

export function getPageRebuildEntry(id: string): PageRebuildEntry | undefined {
  return registryById[id];
}

export function getPageRebuildEntryByPath(path: string): PageRebuildEntry | undefined {
  const normalized = path.split('?')[0].split('#')[0];
  return registryByPath[normalized];
}

export function listPageRebuildEntriesByWave(waveId: string): readonly PageRebuildEntry[] {
  return PAGE_REBUILD_REGISTRY.filter((entry) => entry.waveId === waveId);
}

export function listPendingPageRebuildEntries(): readonly PageRebuildEntry[] {
  return PAGE_REBUILD_REGISTRY.filter((entry) => entry.status === PAGE_REBUILD_STATUS.pending);
}

export function countPageRebuildByStatus(): Record<PageRebuildStatus, number> {
  const counts = Object.values(PAGE_REBUILD_STATUS).reduce(
    (acc, status) => ({ ...acc, [status]: 0 }),
    {} as Record<PageRebuildStatus, number>,
  );
  for (const entry of PAGE_REBUILD_REGISTRY) {
    counts[entry.status] += 1;
  }
  return counts;
}

/** Next page to rebuild — lowest wave order, then architecture priority */
export function getNextPageRebuildTarget(): PageRebuildEntry | undefined {
  const waveOrder = PAGE_REBUILD_WAVES.map((wave) => wave.id);
  const candidates = PAGE_REBUILD_REGISTRY.filter(
    (entry) => entry.status === PAGE_REBUILD_STATUS.inProgress || entry.status === PAGE_REBUILD_STATUS.pending,
  );
  candidates.sort((a, b) => {
    const waveDiff = waveOrder.indexOf(a.waveId) - waveOrder.indexOf(b.waveId);
    if (waveDiff !== 0) return waveDiff;
    if (a.status === PAGE_REBUILD_STATUS.inProgress) return -1;
    if (b.status === PAGE_REBUILD_STATUS.inProgress) return 1;
    return a.label.localeCompare(b.label);
  });
  return candidates[0];
}