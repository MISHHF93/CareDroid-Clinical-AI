import { normalizeEmergencyRole } from './emergencyRolePermissions';
import { isReceptionFirstUxEnabled, RECEPTION_FIRST_UX } from './receptionFirstUx.config';
import { PHYSICIAN_NAV_EXCLUDED_IDS, PHYSICIAN_NAV_ORDER } from '../components/whiteboard/physicianWorkflowModel';

const RECEPTION_FIRST_NAV_ORDER = Object.freeze([
  'reception',
  'patients',
  'ems',
  'queues',
  'whiteboard',
  'reassessment',
  'capacity',
  'boarding',
  'referrals',
  'copilot',
  'tools',
  'analytics',
  'settings',
  'integrations',
  'cosmos',
  'platform',
  'pulse',
  'shift',
]);

const ROLE_NAV_ORDER_OVERRIDES = Object.freeze({
  triage_nurse: ['reception', 'whiteboard', 'patients', 'queues', 'reassessment', 'copilot', 'tools', 'platform', 'ems'],
  charge_nurse: [
    'reception',
    'whiteboard',
    'patients',
    'queues',
    'reassessment',
    'capacity',
    'boarding',
    'referrals',
    'copilot',
    'tools',
    'analytics',
    'platform',
    'ems',
  ],
  ed_manager: [
    'reception',
    'whiteboard',
    'patients',
    'queues',
    'reassessment',
    'capacity',
    'boarding',
    'referrals',
    'copilot',
    'tools',
    'analytics',
    'platform',
    'ems',
  ],
  read_only_viewer: [
    'whiteboard',
    'reception',
    'patients',
    'queues',
    'reassessment',
    'capacity',
    'boarding',
    'referrals',
    'copilot',
    'tools',
    'analytics',
    'integrations',
    'cosmos',
    'platform',
    'ems',
  ],
  physician: PHYSICIAN_NAV_ORDER,
  ems_user: ['ems', 'whiteboard', 'patients', 'capacity', 'tools', 'platform'],
  registration_clerk: ['reception', 'patients', 'pulse', 'shift'],
});

const ROLE_NAV_EXCLUDED_OVERRIDES = Object.freeze({
  registration_clerk: ['queues', 'tools', 'platform', 'settings', 'integrations', 'analytics', 'cosmos', 'copilot', 'intake', 'whiteboard'],
  physician: PHYSICIAN_NAV_EXCLUDED_IDS,
});

export function getRoleNavOrder(role) {
  const normalizedRole = normalizeEmergencyRole(role);
  if (isReceptionFirstUxEnabled() && RECEPTION_FIRST_UX.demoteCommandCenterInNav) {
    const roleOrder = ROLE_NAV_ORDER_OVERRIDES[normalizedRole];
    if (roleOrder?.length) return roleOrder;
    return RECEPTION_FIRST_NAV_ORDER;
  }
  return ROLE_NAV_ORDER_OVERRIDES[normalizedRole] || null;
}

export function getRoleNavExcludedIds(role) {
  return ROLE_NAV_EXCLUDED_OVERRIDES[normalizeEmergencyRole(role)] || [];
}

export function sortNavigationItemsForRole(items, role) {
  const override = getRoleNavOrder(role);
  if (!override?.length) {
    return [...items].sort((first, second) => first.order - second.order);
  }

  const orderIndex = new Map(override.map((id, index) => [id, index]));
  return [...items].sort((first, second) => {
    const firstIndex = orderIndex.get(first.id) ?? Number.MAX_SAFE_INTEGER;
    const secondIndex = orderIndex.get(second.id) ?? Number.MAX_SAFE_INTEGER;
    if (firstIndex !== secondIndex) return firstIndex - secondIndex;
    return first.order - second.order;
  });
}

export function getHiddenNavItemIdsForRole(role, options = {}) {
  const hidden = new Set(getRoleNavExcludedIds(role));
  if (options.hideStandaloneIntake) hidden.add('intake');
  return hidden;
}

export { ROLE_NAV_ORDER_OVERRIDES, ROLE_NAV_EXCLUDED_OVERRIDES, RECEPTION_FIRST_NAV_ORDER };
