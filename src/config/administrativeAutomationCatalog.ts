import type { AdministrativeAutomationCategory } from '../types/administrativeAutomation';

export const ADMINISTRATIVE_AUTOMATION_SAFETY_STATEMENT =
  'Administrative automations are advisory until a licensed clinician approves, modifies, or overrides each task. All actions are audit-logged.';

/** Maps automation task categories to platform automation catalog ids. */
export const CATEGORY_AUTOMATION_IDS: Partial<Record<AdministrativeAutomationCategory, string>> =
  Object.freeze({
    patient_routing: 'emergency-queue-routing-assistant',
    documentation_handoff: 'emergency-disposition-handoff-draft',
    ai_patient_summary: 'emergency-copilot-shift-summary',
    triage_preparation: 'emergency-automated-triage-matrix',
    department_notification: 'emergency-capacity-surge-protocol',
    staff_assignment: 'emergency-staff-routing-assistant',
    queue_prioritization: 'emergency-waiting-room-intelligence',
    escalation_workflow: 'emergency-escalation-engine',
  });

export const AI_ENRICHED_AUTOMATION_CATEGORIES = Object.freeze([
  'patient_routing',
  'triage_preparation',
  'escalation_workflow',
  'ai_patient_summary',
  'staff_assignment',
] as const satisfies readonly AdministrativeAutomationCategory[]);

export const ADMINISTRATIVE_AUTOMATION_CATEGORIES = Object.freeze([
  'patient_routing',
  'documentation_handoff',
  'ai_patient_summary',
  'triage_preparation',
  'department_notification',
  'staff_assignment',
  'queue_prioritization',
  'escalation_workflow',
] as const satisfies readonly AdministrativeAutomationCategory[]);

/** Entitlement asset ids for administrative automation catalog entries. */
export const ADMIN_AUTOMATION_ENTITLEMENT_ASSET_MAP: Readonly<Record<string, string>> = Object.freeze({
  'emergency-queue-routing-assistant': 'agent-operations',
  'emergency-disposition-handoff-draft': 'agent-clinical',
  'emergency-copilot-shift-summary': 'agent-clinical',
  'emergency-automated-triage-matrix': 'agent-clinical',
  'emergency-capacity-surge-protocol': 'agent-operations',
  'emergency-staff-routing-assistant': 'agent-operations',
  'emergency-waiting-room-intelligence': 'agent-operations',
  'emergency-escalation-engine': 'agent-clinical',
});

export function resolveAdminAutomationEntitlementAssetId(automationId: string): string {
  return ADMIN_AUTOMATION_ENTITLEMENT_ASSET_MAP[automationId] || automationId;
}

export function isAdminAutomationEntitled(
  automationId: string,
  context: { entitledAssetIds?: string[]; strictEntitlements?: boolean } = {},
): boolean {
  if (!context.strictEntitlements) return true;
  const entitled = context.entitledAssetIds || [];
  if (!entitled.length) return false;
  const assetId = resolveAdminAutomationEntitlementAssetId(automationId);
  return entitled.includes(assetId) || entitled.includes(automationId);
}