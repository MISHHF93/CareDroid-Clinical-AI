export const PERMISSIVE_EMERGENCY_ROLE_MOCK = Object.freeze({
  role: 'charge_nurse',
  roleLabel: 'Charge Nurse',
  demoRoles: [{ id: 'charge_nurse', label: 'Charge Nurse' }],
  can: () => true,
  presentAction: () => ({
    state: 'A',
    visible: true,
    enabled: true,
    readOnly: false,
    permission: null,
  }),
  actionState: () => 'A',
  actionVisible: () => true,
  actionEnabled: () => true,
  actionReadOnly: () => false,
  canMutate: () => true,
  canMutateSurface: () => true,
  canAccessRoute: () => true,
  nearestRoute: (path) => path,
  switchDemoRole: () => {},
});

export function withEmergencyRoleMock(overrides = {}) {
  return { ...PERMISSIVE_EMERGENCY_ROLE_MOCK, ...overrides };
}
