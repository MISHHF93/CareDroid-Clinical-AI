import { EMERGENCY_ROLE_IDS } from './emergencyRolePermissions';

/**
 * Reception desk UI — list-first, low-noise surfaces for front-desk staff.
 * Backend artifacts (audit, data quality, queue mining) stay available; this config
 * only controls what renders on the reception route.
 */
export const RECEPTION_DESK_UI = Object.freeze({
  enabled: true,
  slimRoles: Object.freeze([EMERGENCY_ROLE_IDS.registrationClerk]),
  coreStripMetricIds: Object.freeze(['arrivals-today', 'awaiting-triage']),
  surfaces: Object.freeze({
    operationalHistory: 'operationalHistory',
    queueAuditPanel: 'queueAuditPanel',
    dataQualityPanel: 'dataQualityPanel',
    searchHint: 'searchHint',
    queueTabBadges: 'queueTabBadges',
    shiftStripLink: 'shiftStripLink',
    /** Nested escalation strip card (replaced by single attention strip). */
    nestedEscalationStrip: 'nestedEscalationStrip',
    /** Full quick-flag card under intake (actions live on task sheet). */
    nestedEscalationQuickActions: 'nestedEscalationQuickActions',
    /** Inline copilot panel in sidebar. */
    inlineCopilot: 'inlineCopilot',
  }),
  slimHiddenSurfaces: Object.freeze([
    'operationalHistory',
    'queueAuditPanel',
    'dataQualityPanel',
    'shiftStripLink',
    'nestedEscalationStrip',
    'nestedEscalationQuickActions',
    'inlineCopilot',
  ]),
  /** Pin quick intake inline on the reception desk — no modal open step. */
  inlineQuickIntakeForSlim: true,
  /** Collapse copilot behind toggle for slim desks (always when surface hidden). */
  collapseCopilotForSlim: true,
});

export function isReceptionDeskUiEnabled() {
  return RECEPTION_DESK_UI.enabled;
}
