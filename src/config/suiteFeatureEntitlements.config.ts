import { SUBSCRIPTION_TIERS } from './entitlements.config';

/**
 * Maps CareDroid suite feature IDs to role permissions and subscription packs.
 * Used by FeatureFlagService for unified entitlement evaluation.
 */
export const SUITE_FEATURE_ENTITLEMENTS = Object.freeze({
  native_ai_routing: {
    featureFlagId: 'ai-clinical-copilot',
    requiredPlan: SUBSCRIPTION_TIERS.PROFESSIONAL,
    requiredPackIds: ['emergency-department-pack'],
    rolePermissions: ['physician', 'charge_nurse', 'triage_nurse', 'admin', 'owner'],
    auditCategory: 'native-ai',
  },
  post_ed_orientation: {
    featureFlagId: 'predictive-analytics-pack',
    requiredPlan: SUBSCRIPTION_TIERS.PROFESSIONAL,
    requiredPackIds: ['emergency-department-pack', 'analytics-pack'],
    rolePermissions: ['charge_nurse', 'physician', 'admin', 'owner'],
    auditCategory: 'predictive-analytics',
  },
  ai_transparency_dashboard: {
    featureFlagId: 'ai-clinical-copilot',
    requiredPlan: SUBSCRIPTION_TIERS.PROFESSIONAL,
    requiredPackIds: ['emergency-department-pack'],
    rolePermissions: ['physician', 'charge_nurse', 'admin', 'owner'],
    auditCategory: 'native-ai',
  },
  native_ai_drift_monitoring: {
    featureFlagId: 'ai-clinical-copilot',
    requiredPlan: SUBSCRIPTION_TIERS.INSTITUTIONAL,
    requiredPackIds: ['emergency-department-pack', 'analytics-pack'],
    rolePermissions: ['admin', 'owner', 'charge_nurse'],
    auditCategory: 'native-ai',
  },
  nlp_triage_expert_system: {
    featureFlagId: 'ai-clinical-copilot',
    requiredPlan: SUBSCRIPTION_TIERS.PROFESSIONAL,
    requiredPackIds: ['emergency-department-pack'],
    rolePermissions: ['registration_clerk', 'triage_nurse', 'charge_nurse', 'admin', 'owner'],
    auditCategory: 'native-ai',
  },
  voice_interview_assistant: {
    featureFlagId: 'ai-clinical-copilot',
    requiredPlan: SUBSCRIPTION_TIERS.PROFESSIONAL,
    requiredPackIds: ['emergency-department-pack'],
    rolePermissions: ['registration_clerk', 'triage_nurse', 'charge_nurse', 'admin', 'owner'],
    auditCategory: 'native-ai',
  },
  clinical_acuity_dashboard: {
    featureFlagId: 'predictive-analytics-pack',
    requiredPlan: SUBSCRIPTION_TIERS.PROFESSIONAL,
    requiredPackIds: ['emergency-department-pack', 'analytics-pack'],
    rolePermissions: ['charge_nurse', 'physician', 'admin', 'owner'],
    auditCategory: 'command-center',
  },
  patient_document_artifacts: {
    featureFlagId: 'ai-clinical-copilot',
    requiredPlan: SUBSCRIPTION_TIERS.PROFESSIONAL,
    requiredPackIds: ['emergency-department-pack'],
    rolePermissions: ['physician', 'charge_nurse', 'triage_nurse', 'registration_clerk', 'admin', 'owner'],
    permissionKeys: ['can_view_copilot', 'copilot_use'],
    auditCategory: 'document-artifacts',
  },
  admission_prediction: {
    featureFlagId: 'predictive-analytics-pack',
    requiredPlan: SUBSCRIPTION_TIERS.PROFESSIONAL,
    requiredPackIds: ['emergency-department-pack', 'analytics-pack'],
    rolePermissions: ['charge_nurse', 'physician', 'admin', 'owner'],
    auditCategory: 'predictive-analytics',
  },
  journey_prediction: {
    featureFlagId: 'predictive-analytics-pack',
    requiredPlan: SUBSCRIPTION_TIERS.PROFESSIONAL,
    requiredPackIds: ['emergency-department-pack', 'analytics-pack'],
    rolePermissions: ['charge_nurse', 'physician', 'admin', 'owner'],
    auditCategory: 'predictive-analytics',
  },
  command_predictive_alerts: {
    featureFlagId: 'predictive-analytics-pack',
    requiredPlan: SUBSCRIPTION_TIERS.PROFESSIONAL,
    requiredPackIds: ['emergency-department-pack', 'analytics-pack'],
    rolePermissions: ['charge_nurse', 'admin', 'owner'],
    auditCategory: 'command-center',
  },
  patient_whiteboard: {
    featureFlagId: 'patient-experience-pack',
    requiredPlan: SUBSCRIPTION_TIERS.FREE,
    requiredPackIds: ['emergency-department-pack'],
    rolePermissions: ['*'],
    auditCategory: 'patient-experience',
  },
  pre_arrival_activation: {
    featureFlagId: 'ems-pre-arrival-pack',
    requiredPlan: SUBSCRIPTION_TIERS.PROFESSIONAL,
    requiredPackIds: ['emergency-department-pack'],
    rolePermissions: ['charge_nurse', 'ems', 'admin', 'owner'],
    auditCategory: 'ems-pre-arrival',
  },
  ed_copilot: {
    featureFlagId: 'ai-clinical-copilot',
    requiredPlan: SUBSCRIPTION_TIERS.PROFESSIONAL,
    requiredPackIds: ['emergency-department-pack'],
    rolePermissions: ['physician', 'charge_nurse', 'admin', 'owner'],
    permissionKeys: ['can_view_copilot', 'copilot_use'],
    auditCategory: 'ai-copilot',
  },
  emergency_analytics: {
    featureFlagId: 'predictive-analytics-pack',
    requiredPlan: SUBSCRIPTION_TIERS.PROFESSIONAL,
    requiredPackIds: ['analytics-pack'],
    rolePermissions: ['charge_nurse', 'admin', 'owner'],
    auditCategory: 'analytics',
  },
});

export function getSuiteFeatureEntitlement(featureId) {
  return SUITE_FEATURE_ENTITLEMENTS[featureId] || null;
}