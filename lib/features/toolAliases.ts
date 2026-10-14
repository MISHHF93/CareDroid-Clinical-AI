/**
 * Canonical legacy workspace enabledToolIds → canonical asset IDs mapping.
 * Shared between frontend asset entitlements and backend platform asset seeding.
 */
export const LEGACY_TOOL_ID_ALIASES: Record<string, string[]> = Object.freeze({
  calculators: ['calculators', 'calculators-hub'],
  'drug-check': ['drug-check'],
  'lab-interp': ['lab-interp'],
  protocols: ['protocols'],
  'diagnosis-assistant': ['diagnosis'],
  'hospital-map': ['hospital-map'],
  'medical-iot': ['telemetry-monitoring', 'medical-iot'],
  'emergency-protocols': ['protocols', 'acls-protocol', 'atls-protocol'],
  'trauma-score': ['revised-trauma-score', 'gcs-calculator'],
  'sofa-score': ['sofa-score', 'sofa-calculator'],
  'fleet-live-map': ['fleet-live-map', 'live-map'],
  'fleet-dashboard': ['fleet-dashboard'],
  'route-optimizer': ['route-optimizer'],
  'predictive-maintenance': ['predictive-maintenance'],
  'guideline-rag': ['guideline-rag'],
  'ai-explainability': ['ai-explainability'],
  'clinical-audit': ['clinical-audit'],
  'differential-ai': ['differential-ai'],
  'audit-logs': ['audit-logs'],
  analytics: ['analytics'],
  'team-management': ['team-management'],
  'system-config': ['system-config'],
});
