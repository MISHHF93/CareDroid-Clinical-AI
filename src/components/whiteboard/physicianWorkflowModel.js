import { EMERGENCY_ROLE_IDS } from '../../config/emergencyRolePermissions';

/** Workflow launchers already in the product (card, palette, document events). */
export const PHYSICIAN_WORKFLOW_LAUNCHERS = Object.freeze([
  Object.freeze({
    id: 'review',
    label: 'Review patient',
    surfaces: ['PatientCard', 'PatientDetailPanel'],
    mechanism: 'selectPatient',
  }),
  Object.freeze({
    id: 'advance',
    label: 'Advance journey',
    surfaces: ['PatientCard', 'PatientDetailPanel'],
    mechanism: 'advancePatientJourneyState',
  }),
  Object.freeze({
    id: 'reassess',
    label: 'Reassessment',
    surfaces: ['PatientCard', 'CommandPalette', 'ChargeNurseOperationalStrip'],
    mechanism: 'open-reassessment-drawer',
  }),
  Object.freeze({
    id: 'refer',
    label: 'Referral / consult',
    surfaces: ['PatientCard', 'CommandPalette'],
    mechanism: 'referral-workflow',
  }),
  Object.freeze({
    id: 'discharge',
    label: 'Discharge review',
    surfaces: ['PatientCard', 'CommandPalette', 'Header'],
    mechanism: 'open-patient-discharge',
  }),
  Object.freeze({
    id: 'copilot',
    label: 'ED Copilot',
    surfaces: ['CommandPalette', 'Sidebar'],
    mechanism: 'toggleCopilot',
  }),
]);

export const PHYSICIAN_NAV_EXCLUDED_IDS = Object.freeze([
  'reception',
  'ems',
  'intake',
  'queues',
  'reassessment',
  'capacity',
  'boarding',
  'referrals',
  'integrations',
  'cosmos',
]);

export const PHYSICIAN_NAV_ORDER = Object.freeze([
  'whiteboard',
  'patients',
  'copilot',
  'tools',
  'analytics',
  'platform',
]);

export function isPhysicianRole(roleId) {
  return roleId === EMERGENCY_ROLE_IDS.physician;
}

export function resolvePatientCardWorkflowProfile({
  roleId,
  displayMode = false,
  canMutateWhiteboard = false,
  isRegistrationClerk = false,
} = {}) {
  if (displayMode) return 'none';
  if (isPhysicianRole(roleId)) return 'physician';
  if (canMutateWhiteboard && !isRegistrationClerk) return 'charge';
  return 'none';
}

export function physicianCardActionIds(profile) {
  if (profile !== 'physician') return [];
  return ['review', 'advance', 'reassess', 'refer', 'discharge', 'copilot'];
}
