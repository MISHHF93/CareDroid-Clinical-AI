import { EMERGENCY_ROLE_IDS } from './emergencyRolePermissions';

/**
 * Reception desk UI — list-first, low-noise surfaces for front-desk staff.
 * Backend artifacts (audit, data quality, queue mining) stay available; this config
 * only controls what renders on the reception route.
 */
export const RECEPTION_DESK_UI = Object.freeze({
  enabled: true,
  slimRoles: Object.freeze([EMERGENCY_ROLE_IDS.registrationClerk]),
  coreStripMetricIds: Object.freeze([
    'arrivals-today',
    'awaiting-verification',
    'awaiting-triage',
    'queue-size',
    'ems-inbound',
  ]),
  surfaces: Object.freeze({
    operationalHistory: 'operationalHistory',
    queueAuditPanel: 'queueAuditPanel',
    dataQualityPanel: 'dataQualityPanel',
    searchHint: 'searchHint',
    queueTabBadges: 'queueTabBadges',
    shiftStripLink: 'shiftStripLink',
  }),
  slimHiddenSurfaces: Object.freeze([
    'operationalHistory',
    'queueAuditPanel',
    'dataQualityPanel',
    'searchHint',
    'queueTabBadges',
    'shiftStripLink',
  ]),
  /** Pin quick intake inline on the reception desk — no modal open step. */
  inlineQuickIntakeForSlim: true,
});

export function isReceptionDeskUiEnabled() {
  return RECEPTION_DESK_UI.enabled;
}
