import { CANONICAL_ROUTES } from './routes.config';
import { NAVIGATION_ITEMS, getPilotCustomerNavigationItems } from './unified-navigation.config';

const ROUTE_COMMAND_METADATA_BY_NAV_ID = Object.freeze({
  whiteboard: {
    label: 'Open Whiteboard',
    hint: 'W',
    keywords: ['whiteboard', 'board', 'patient flow', 'operational screen'],
  },
  patients: {
    label: 'Open Patients',
    hint: 'P',
    keywords: ['patients', 'patient list', 'snapshots'],
  },
  ems: {
    label: 'Open EMS',
    hint: 'E',
    keywords: ['ems', 'pre-arrival', 'ambulance', 'pipeline'],
  },
  intake: {
    label: 'Open Intake',
    hint: 'I',
    keywords: ['intake', 'arrival', 'identity', 'registration', 'ocr'],
  },
  reception: {
    label: 'Open Reception',
    hint: 'Rec',
    keywords: ['reception', 'arrival', 'front desk', 'registration', 'check in'],
  },
  queues: {
    label: 'Open Queues',
    hint: 'Q',
    keywords: ['queues', 'queue intelligence', 'waiting', 'who next'],
  },
  reassessment: {
    label: 'Open Reassessment',
    hint: 'R',
    keywords: ['reassessment', 'due', 'safety', 'review'],
  },
  capacity: {
    label: 'Open Flow & Capacity',
    hint: 'C',
    keywords: ['capacity', 'flow', 'rooms', 'pressure', 'occupancy', 'boarding'],
  },
  referrals: {
    label: 'Open Referrals',
    hint: 'Ref',
    keywords: ['referrals', 'consults', 'transfer', 'specialty'],
  },
  copilot: {
    label: 'Open Copilot',
    hint: 'AI',
    keywords: ['copilot', 'assistant', 'ai', 'chat'],
  },
  tools: {
    label: 'Open Medical Tools',
    hint: 'T',
    keywords: ['medical tools', 'tools', 'clinical tools', 'calculators', 'scores'],
  },
  pulse: {
    label: 'Open Department Pulse',
    hint: 'Pulse',
    keywords: ['pulse', 'department pulse', 'status strip', 'mission control', 'charge nurse'],
  },
  shift: {
    label: 'Open Shift Summary',
    hint: 'Shift',
    keywords: ['shift', 'shift summary', 'handoff', 'brief', 'handover'],
  },
  help: {
    label: 'Open Help Center',
    hint: '?',
    keywords: ['guide', 'help', 'manual', 'procedure', 'training'],
  },
});

function routeCommandFromNavigationItem(item) {
  const metadata = ROUTE_COMMAND_METADATA_BY_NAV_ID[item.id] || {};
  return Object.freeze({
    id: `open-${item.id}`,
    navItemId: item.id,
    label: metadata.label || `Open ${item.label}`,
    hint: metadata.hint,
    keywords: metadata.keywords || [item.label.toLowerCase(), item.id],
    build: () => ({ type: 'OPEN_ROUTE', path: item.path }),
  });
}

const RETAINED_DIRECT_ROUTE_COMMANDS = Object.freeze([
  {
    id: 'open-boarding',
    navItemId: 'boarding',
    label: 'Open Boarding',
    hint: 'B',
    keywords: ['boarding', 'admission pending', 'boarders', 'inpatient bed'],
    build: () => ({
      type: 'OPEN_ROUTE',
      path: `${CANONICAL_ROUTES.emergencyCapacity}?view=boarding`,
    }),
  },
  {
    id: 'open-pulse',
    navItemId: 'pulse',
    label: 'Open Department Pulse',
    hint: 'Pulse',
    keywords: ['pulse', 'department pulse', 'status strip', 'mission control', 'charge nurse'],
    build: () => ({ type: 'OPEN_ROUTE', path: CANONICAL_ROUTES.emergencyPulse }),
  },
  {
    id: 'open-shift',
    navItemId: 'shift',
    label: 'Open Shift Summary',
    hint: 'Shift',
    keywords: ['shift', 'shift summary', 'handoff', 'brief', 'handover'],
    build: () => ({ type: 'OPEN_ROUTE', path: CANONICAL_ROUTES.emergencyShift }),
  },
]);

export const EMERGENCY_OS_ROUTE_COMMANDS = Object.freeze([
  ...getPilotCustomerNavigationItems(NAVIGATION_ITEMS).map(routeCommandFromNavigationItem),
  ...RETAINED_DIRECT_ROUTE_COMMANDS,
]);

export const EMERGENCY_OS_HELP_COMMANDS = Object.freeze([
  {
    id: 'open-guide',
    // Distinct from the 'help' nav-id command below ("Open Help Center", which
    // navigates to the full /emergency/help page) -- this one opens the quick
    // help panel/overlay (OPEN_HELP), matching the sidebar quick-launcher
    // button's own "Help" label (SidebarChromeControls.tsx) rather than
    // duplicating the page command's exact text in palette search results.
    label: 'Open Help',
    hint: '?',
    keywords: [
      'help',
      'guide',
      'manual',
      'procedure',
      'process',
      'how to',
      'training',
      'walkthrough',
    ],
    build: () => ({ type: 'OPEN_HELP', tab: 'page' }),
  },
  {
    id: 'open-guide-role',
    label: 'Open my role playbook',
    hint: 'Role',
    keywords: ['role', 'playbook', 'permissions', 'what can i do'],
    build: () => ({ type: 'OPEN_HELP', tab: 'role' }),
  },
  {
    id: 'open-guide-process',
    label: 'Open full ED process (A–K)',
    hint: 'A–K',
    keywords: ['journey', 'walkthrough', 'demo', 'a-k', 'process', 'patient flow'],
    build: () => ({ type: 'OPEN_HELP', tab: 'process' }),
  },
]);

export const EMERGENCY_OS_TOOL_COMMANDS = Object.freeze([
  {
    id: 'open-calculators',
    label: 'Open Calculators',
    hint: 'Calc',
    keywords: ['calculator', 'calculators', 'scores', 'clinical scores', 'medical calculators'],
    build: () => ({
      type: 'OPEN_ROUTE',
      path: `${CANONICAL_ROUTES.emergencyTools}?source=calculators&filter=calculator`,
    }),
  },
  {
    id: 'open-qsofa',
    label: 'Open qSOFA Calculator',
    hint: 'qSOFA',
    keywords: ['qsofa', 'quick sofa', 'sepsis score', 'sepsis calculator'],
    build: () => ({
      type: 'OPEN_ROUTE',
      path: `${CANONICAL_ROUTES.emergencyTools}?source=calculators&filter=calculator&q=qsofa&open=qsofa`,
    }),
  },
  {
    id: 'open-heart-score',
    label: 'Open HEART Score',
    hint: 'HEART',
    keywords: ['heart', 'heart score', 'chest pain', 'acs', 'cardiac score'],
    build: () => ({
      type: 'OPEN_ROUTE',
      path: `${CANONICAL_ROUTES.emergencyTools}?source=calculators&filter=calculator&q=heart-score&open=heart-score`,
    }),
  },
  {
    id: 'open-nihss',
    label: 'Open NIHSS',
    hint: 'NIHSS',
    keywords: ['nihss', 'stroke', 'stroke scale', 'neuro score'],
    build: () => ({
      type: 'OPEN_ROUTE',
      path: `${CANONICAL_ROUTES.emergencyTools}?source=calculators&filter=calculator&q=nihss&open=nihss`,
    }),
  },
]);
