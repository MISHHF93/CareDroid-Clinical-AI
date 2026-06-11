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
  return Boolean(emergencyPermissionsForUser(user)[action]);
}

export { PERMISSIONS_BY_ROLE };
