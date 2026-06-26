/**
 * Role and permission surface for the unified CareDroid ED application.
 */
export {
  EMERGENCY_ACTIONS,
  EMERGENCY_ROLE_IDS,
  getEmergencyRoleDefinition,
  getEmergencyRoleHomeRoute,
  getReceptionEmbeddedIntakePath,
  getReceptionPrimaryCreatePath,
  getReceptionQuickCreatePath,
  normalizeEmergencyRole,
  prefersReceptionForPatientCreate,
  shouldHideStandaloneIntakeNav,
  canAccessEmergencyRoute,
  canPerformEmergencyAction,
} from '../config/emergencyRolePermissions';

export { getVisibleNavigation, PILOT_CORE_NAV_ITEM_IDS } from '../config/unified-navigation.config';