import { CANONICAL_ROUTES } from './routes.config';
import {
  NAVIGATION_ITEMS,
  getPilotCustomerNavigationItems,
} from './unified-navigation.config';

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
    label: 'Open Capacity',
    hint: 'C',
    keywords: ['capacity', 'rooms', 'pressure', 'occupancy'],
  },
  boarding: {
    label: 'Open Boarding',
    hint: 'B',
    keywords: ['boarding', 'admission pending', 'boarders'],
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

export const EMERGENCY_OS_ROUTE_COMMANDS = Object.freeze(
  [
    ...getPilotCustomerNavigationItems(NAVIGATION_ITEMS).map(routeCommandFromNavigationItem),
    ...RETAINED_DIRECT_ROUTE_COMMANDS,
  ],
);
