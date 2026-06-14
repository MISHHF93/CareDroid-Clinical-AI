import { CANONICAL_ROUTES } from './routes.config';
import { isPilotCustomerVisibleNavItemId } from './unified-navigation.config';

const EMERGENCY_OS_ROUTE_COMMAND_DEFINITIONS = Object.freeze([
  {
    id: 'open-whiteboard',
    navItemId: 'whiteboard',
    label: 'Open Whiteboard',
    hint: 'W',
    keywords: ['whiteboard', 'board', 'patient flow', 'operational screen'],
    build: () => ({ type: 'OPEN_ROUTE', path: CANONICAL_ROUTES.emergencyWhiteboard }),
  },
  {
    id: 'open-patients',
    navItemId: 'patients',
    label: 'Open Patients',
    hint: 'P',
    keywords: ['patients', 'patient list', 'snapshots'],
    build: () => ({ type: 'OPEN_ROUTE', path: CANONICAL_ROUTES.emergencyPatients }),
  },
  {
    id: 'open-ems',
    navItemId: 'ems',
    label: 'Open EMS',
    hint: 'E',
    keywords: ['ems', 'pre-arrival', 'ambulance', 'pipeline'],
    build: () => ({ type: 'OPEN_ROUTE', path: CANONICAL_ROUTES.emergencyEms }),
  },
  {
    id: 'open-intake',
    navItemId: 'intake',
    label: 'Open Intake',
    hint: 'I',
    keywords: ['intake', 'arrival', 'identity', 'registration', 'ocr'],
    build: () => ({ type: 'OPEN_ROUTE', path: CANONICAL_ROUTES.emergencyIntake }),
  },
  {
    id: 'open-queues',
    navItemId: 'queues',
    label: 'Open Queues',
    hint: 'Q',
    keywords: ['queues', 'queue intelligence', 'waiting', 'who next'],
    build: () => ({ type: 'OPEN_ROUTE', path: CANONICAL_ROUTES.emergencyQueues }),
  },
  {
    id: 'open-reassessment',
    navItemId: 'reassessment',
    label: 'Open Reassessment',
    hint: 'R',
    keywords: ['reassessment', 'due', 'safety', 'review'],
    build: () => ({ type: 'OPEN_ROUTE', path: CANONICAL_ROUTES.emergencyReassessment }),
  },
  {
    id: 'open-capacity',
    navItemId: 'capacity',
    label: 'Open Capacity',
    hint: 'C',
    keywords: ['capacity', 'rooms', 'pressure', 'occupancy'],
    build: () => ({ type: 'OPEN_ROUTE', path: CANONICAL_ROUTES.emergencyCapacity }),
  },
  {
    id: 'open-boarding',
    navItemId: 'boarding',
    label: 'Open Boarding',
    hint: 'B',
    keywords: ['boarding', 'admission pending', 'boarders'],
    build: () => ({ type: 'OPEN_ROUTE', path: CANONICAL_ROUTES.emergencyBoarding }),
  },
  {
    id: 'open-referrals',
    navItemId: 'referrals',
    label: 'Open Referrals',
    hint: 'Ref',
    keywords: ['referrals', 'consults', 'transfer', 'specialty'],
    build: () => ({ type: 'OPEN_ROUTE', path: CANONICAL_ROUTES.emergencyReferrals }),
  },
  {
    id: 'open-copilot',
    navItemId: 'copilot',
    label: 'Open Copilot',
    hint: 'AI',
    keywords: ['copilot', 'assistant', 'ai', 'chat'],
    build: () => ({ type: 'OPEN_ROUTE', path: CANONICAL_ROUTES.emergencyCopilot }),
  },
  {
    id: 'open-analytics',
    navItemId: 'analytics',
    label: 'Open Analytics',
    hint: 'A',
    keywords: ['analytics', 'throughput', 'metrics', 'trends'],
    build: () => ({ type: 'OPEN_ROUTE', path: CANONICAL_ROUTES.emergencyAnalytics }),
  },
  {
    id: 'open-settings',
    navItemId: 'settings',
    label: 'Open Settings',
    hint: 'S',
    keywords: ['settings', 'thresholds', 'staff', 'configuration'],
    build: () => ({ type: 'OPEN_ROUTE', path: CANONICAL_ROUTES.emergencySettings }),
  },
]);

export const EMERGENCY_OS_ROUTE_COMMANDS = Object.freeze(
  EMERGENCY_OS_ROUTE_COMMAND_DEFINITIONS.filter((command) =>
    isPilotCustomerVisibleNavItemId(command.navItemId),
  ),
);
