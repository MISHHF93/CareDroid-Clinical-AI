/**
 * Legacy MD/RN/PA/Tech permission helpers — delegate to canonical CareDroid registry.
 */
import {
  hasEmergencyActionPermission,
  resolveEmergencyRoleId,
} from '../config/emergencyRolePermissions';
import { EMERGENCY_PERMISSION_KEYS } from '../config/emergencyPermissionRegistry';

const ROLE_ALIASES = Object.freeze({
  physician: 'MD',
  doctor: 'MD',
  md: 'MD',
  attending: 'MD',
  resident: 'MD',
  consultant: 'MD',
  nurse: 'RN',
  rn: 'RN',
  triagenurse: 'RN',
  chargenurse: 'RN',
  pa: 'PA',
  physicianassistant: 'PA',
  tech: 'Tech',
  technician: 'Tech',
  paramedic: 'Tech',
  clerk: 'Tech',
  admin: 'Admin',
  administrator: 'Admin',
});

const LEGACY_ACTION_TO_PERMISSION = Object.freeze({
  canUpdateVitals: EMERGENCY_PERMISSION_KEYS.vitalsWrite,
  canManageFlags: EMERGENCY_PERMISSION_KEYS.flagsManage,
  canAddNotes: EMERGENCY_PERMISSION_KEYS.notesWrite,
  canAssignRoom: EMERGENCY_PERMISSION_KEYS.patientAssignRoom,
  canAssignStaff: EMERGENCY_PERMISSION_KEYS.patientAssignStaff,
  canDischarge: EMERGENCY_PERMISSION_KEYS.patientDischarge,
  canTransfer: EMERGENCY_PERMISSION_KEYS.transferManage,
  canUseOrders: EMERGENCY_PERMISSION_KEYS.notesWrite,
  canManageShift: EMERGENCY_PERMISSION_KEYS.workloadReassign,
});

const PERMISSIONS_BY_ROLE = Object.freeze({
  MD: Object.freeze({
    canUpdateVitals: true,
    canManageFlags: true,
    canAddNotes: true,
    canAssignRoom: true,
    canAssignStaff: true,
    canDischarge: true,
    canTransfer: true,
    canUseOrders: true,
    canManageShift: false,
  }),
  RN: Object.freeze({
    canUpdateVitals: true,
    canManageFlags: true,
    canAddNotes: true,
    canAssignRoom: false,
    canAssignStaff: false,
    canDischarge: false,
    canTransfer: false,
    canUseOrders: false,
    canManageShift: false,
  }),
  PA: Object.freeze({
    canUpdateVitals: true,
    canManageFlags: true,
    canAddNotes: true,
    canAssignRoom: true,
    canAssignStaff: false,
    canDischarge: false,
    canTransfer: true,
    canUseOrders: true,
    canManageShift: false,
  }),
  Tech: Object.freeze({
    canUpdateVitals: false,
    canManageFlags: false,
    canAddNotes: false,
    canAssignRoom: true,
    canAssignStaff: false,
    canDischarge: false,
    canTransfer: false,
    canUseOrders: false,
    canManageShift: false,
  }),
  Admin: Object.freeze({
    canUpdateVitals: false,
    canManageFlags: false,
    canAddNotes: false,
    canAssignRoom: false,
    canAssignStaff: false,
    canDischarge: false,
    canTransfer: false,
    canUseOrders: false,
    canManageShift: true,
  }),
});

function normalizeRoleToken(value) {
  return String(value || '')
    .replace(/[^a-zA-Z]/g, '')
    .toLowerCase();
}

export function emergencyRoleForUser(user) {
  const role = normalizeRoleToken(user?.role || user?.saasRole || user?.profession);
  return ROLE_ALIASES[role] || 'MD';
}

export function emergencyRoleForStaff(staff) {
  const role = normalizeRoleToken(staff?.role || staff?.roleLabel);
  return ROLE_ALIASES[role] || staff?.roleLabel || 'Staff';
}

export function emergencyPermissionsForUser(user) {
  const role = emergencyRoleForUser(user);
  return PERMISSIONS_BY_ROLE[role] || PERMISSIONS_BY_ROLE.MD;
}

export function canUseEmergencyAction(user, action) {
  const permission = LEGACY_ACTION_TO_PERMISSION[action] || action;
  const role = resolveEmergencyRoleId(user);
  return hasEmergencyActionPermission(role, permission);
}

export { PERMISSIONS_BY_ROLE };
