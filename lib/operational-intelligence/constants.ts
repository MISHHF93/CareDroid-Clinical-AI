export const CARE_DROID_OPERATIONAL_INTELLIGENCE_LAYER = 'CareDroidOperationalIntelligence' as const;
export const OI_RULE_BASELINE_VERSION = '1.0.0-rule-baseline';

export const OPERATIONAL_INTELLIGENCE_DISCLAIMERS = Object.freeze({
  operational: 'Operational intelligence is advisory. Human review required.',
  clinical: 'Human review required. This is not a replacement for clinical judgment.',
  externalData: 'External health record data requires clinician review before use.',
});

export const BLOCKED_AUTONOMOUS_OI_ACTIONS = Object.freeze([
  'change_patient_journey_state',
  'assign_acuity',
  'diagnose',
  'prescribe',
  'discharge',
  'admit',
  'merge_patients',
  'import_external_data',
  'send_clinical_orders',
  'override_staff',
  'auto_triage',
  'auto_identify_patient',
]);