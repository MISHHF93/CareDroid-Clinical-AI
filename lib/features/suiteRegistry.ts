/**
 * CareDroid normalized suite taxonomy.
 * All product surfaces map to one core (1–7) or extension/platform (8–11) suite.
 */

export type CareDroidSuiteId =
  | 'reception_arrival'
  | 'emergency_whiteboard'
  | 'triage_reassessment_clinical_flow'
  | 'ems_referral_boarding'
  | 'physician_clinical_copilot'
  | 'charge_nurse_command'
  | 'analytics_simulation_qa'
  | 'fleet_ambulance_extension'
  | 'telemetry_iot_digital_twin'
  | 'platform_admin_saas'
  | 'integration_hub_automation';

export type SuiteLayer = 'core' | 'extension' | 'platform' | 'legacy';

export type MaturityLabel = 'live' | 'demo' | 'planned' | 'preview';

export type WhiteboardLink =
  | 'patient_card'
  | 'patient_card_drawer'
  | 'board_queue_state'
  | 'board_workflow_panel'
  | 'role_view'
  | 'suite_route'
  | 'platform_admin'
  | 'none';

export interface CareDroidSuite {
  id: CareDroidSuiteId;
  number: number;
  label: string;
  layer: SuiteLayer;
  description: string;
}

export const CAREDROID_SUITES: readonly CareDroidSuite[] = Object.freeze([
  {
    id: 'reception_arrival',
    number: 1,
    label: 'Reception & Arrival Suite',
    layer: 'core',
    description: 'Arrivals, reception intake, identity verification, and waiting-room handoff.',
  },
  {
    id: 'emergency_whiteboard',
    number: 2,
    label: 'Emergency Whiteboard Suite',
    layer: 'core',
    description: 'Patient whiteboard, queue visibility, patient cards, and operational board state.',
  },
  {
    id: 'triage_reassessment_clinical_flow',
    number: 3,
    label: 'Triage / Reassessment / Clinical Flow Suite',
    layer: 'core',
    description: 'Triage review, reassessment, deterioration tracking, and clinical calculators.',
  },
  {
    id: 'ems_referral_boarding',
    number: 4,
    label: 'EMS / Referral / Boarding Coordination Suite',
    layer: 'core',
    description: 'EMS pre-arrival, offload, referrals, boarding, and capacity coordination.',
  },
  {
    id: 'physician_clinical_copilot',
    number: 5,
    label: 'Physician / Clinical Copilot Suite',
    layer: 'core',
    description: 'Case-aware AI copilot, calculators, summaries, and evidence-linked assistance.',
  },
  {
    id: 'charge_nurse_command',
    number: 6,
    label: 'Charge Nurse / Command Center Suite',
    layer: 'core',
    description: 'Department pulse, surge, shift handoff, and command visibility.',
  },
  {
    id: 'analytics_simulation_qa',
    number: 7,
    label: 'Analytics / Simulation / QA Suite',
    layer: 'core',
    description: 'Throughput analytics, simulation, training, and quality assurance.',
  },
  {
    id: 'fleet_ambulance_extension',
    number: 8,
    label: 'Fleet / Ambulance Operations Extension',
    layer: 'extension',
    description: 'Ambulance fleet command, routing, and predictive maintenance.',
  },
  {
    id: 'telemetry_iot_digital_twin',
    number: 9,
    label: 'Telemetry / IoT / Digital Twin Extension',
    layer: 'extension',
    description: 'Medical IoT, surveillance, hospital maps, and digital twin intelligence.',
  },
  {
    id: 'platform_admin_saas',
    number: 10,
    label: 'Platform Admin / SaaS Packaging / Entitlements',
    layer: 'platform',
    description: 'Tenant admin, billing, feature flags, RBAC, and commercial packaging.',
  },
  {
    id: 'integration_hub_automation',
    number: 11,
    label: 'Integration Hub / Automation / Shared Platform Services',
    layer: 'platform',
    description: 'FHIR/HL7 integrations, automation, MCP tooling, and shared services.',
  },
]);

export interface FeatureSuiteAssignment {
  suiteId: CareDroidSuiteId;
  layer: SuiteLayer;
  maturity: MaturityLabel;
  whiteboardLink: WhiteboardLink;
  route?: string;
  notes?: string;
}

export const FEATURE_SUITE_ASSIGNMENTS: Readonly<Record<string, FeatureSuiteAssignment>> =
  Object.freeze({
    reception_workspace: {
      suiteId: 'reception_arrival',
      layer: 'core',
      maturity: 'live',
      whiteboardLink: 'patient_card',
      route: '/emergency/reception',
      notes: 'Reception prepares patient cards before whiteboard handoff.',
    },
    smart_intake: {
      suiteId: 'reception_arrival',
      layer: 'core',
      maturity: 'live',
      whiteboardLink: 'patient_card',
      route: '/emergency/reception',
      notes: 'Consolidated into ReceptionWorkspace; standalone intake redirects when reception-first UX is on.',
    },
    intake_ai_suggest: {
      suiteId: 'reception_arrival',
      layer: 'core',
      maturity: 'demo',
      whiteboardLink: 'patient_card_drawer',
      notes: 'Copilot suggests intake protocol chips; nurse verifies.',
    },

    emergency_whiteboard: {
      suiteId: 'emergency_whiteboard',
      layer: 'core',
      maturity: 'live',
      whiteboardLink: 'board_queue_state',
      route: '/emergency/whiteboard',
    },
    dispatch_console: {
      suiteId: 'ems_referral_boarding',
      layer: 'core',
      maturity: 'live',
      whiteboardLink: 'board_workflow_panel',
      route: '/emergency/dispatch',
    },
    ed_readiness: {
      suiteId: 'ems_referral_boarding',
      layer: 'core',
      maturity: 'live',
      whiteboardLink: 'board_workflow_panel',
      route: '/emergency/ed-readiness',
    },
    emergency_patients: {
      suiteId: 'emergency_whiteboard',
      layer: 'core',
      maturity: 'live',
      whiteboardLink: 'patient_card',
      route: '/emergency/patients',
    },
    queue_intelligence: {
      suiteId: 'emergency_whiteboard',
      layer: 'core',
      maturity: 'live',
      whiteboardLink: 'board_queue_state',
      route: '/emergency/queues',
    },

    reassessment_engine: {
      suiteId: 'triage_reassessment_clinical_flow',
      layer: 'core',
      maturity: 'live',
      whiteboardLink: 'patient_card',
      route: '/emergency/reassessment',
    },
    clinical_calculator_hub: {
      suiteId: 'triage_reassessment_clinical_flow',
      layer: 'core',
      maturity: 'live',
      whiteboardLink: 'patient_card_drawer',
      route: '/emergency/tools',
    },
    heart_score: { suiteId: 'triage_reassessment_clinical_flow', layer: 'core', maturity: 'live', whiteboardLink: 'patient_card_drawer' },
    qsofa: { suiteId: 'triage_reassessment_clinical_flow', layer: 'core', maturity: 'live', whiteboardLink: 'patient_card_drawer' },
    nihss: { suiteId: 'triage_reassessment_clinical_flow', layer: 'core', maturity: 'live', whiteboardLink: 'patient_card_drawer' },
    curb65: { suiteId: 'triage_reassessment_clinical_flow', layer: 'core', maturity: 'live', whiteboardLink: 'patient_card_drawer' },
    wells_pe: { suiteId: 'triage_reassessment_clinical_flow', layer: 'core', maturity: 'live', whiteboardLink: 'patient_card_drawer' },
    news2: { suiteId: 'triage_reassessment_clinical_flow', layer: 'core', maturity: 'live', whiteboardLink: 'patient_card_drawer' },
    timi: { suiteId: 'triage_reassessment_clinical_flow', layer: 'core', maturity: 'live', whiteboardLink: 'patient_card_drawer' },
    alvarado: { suiteId: 'triage_reassessment_clinical_flow', layer: 'core', maturity: 'preview', whiteboardLink: 'patient_card_drawer' },
    pews: { suiteId: 'triage_reassessment_clinical_flow', layer: 'core', maturity: 'live', whiteboardLink: 'patient_card_drawer' },
    phq9: { suiteId: 'triage_reassessment_clinical_flow', layer: 'core', maturity: 'live', whiteboardLink: 'patient_card_drawer' },
    gad7: { suiteId: 'triage_reassessment_clinical_flow', layer: 'core', maturity: 'live', whiteboardLink: 'patient_card_drawer' },
    columbia_suicide: { suiteId: 'triage_reassessment_clinical_flow', layer: 'core', maturity: 'live', whiteboardLink: 'patient_card_drawer' },
    glasgow_coma: { suiteId: 'triage_reassessment_clinical_flow', layer: 'core', maturity: 'live', whiteboardLink: 'patient_card_drawer' },
    pediatric_drug_calc: { suiteId: 'triage_reassessment_clinical_flow', layer: 'core', maturity: 'live', whiteboardLink: 'patient_card_drawer' },
    iv_fluid_calc: { suiteId: 'triage_reassessment_clinical_flow', layer: 'core', maturity: 'preview', whiteboardLink: 'patient_card_drawer' },
    drug_dose_calc: { suiteId: 'triage_reassessment_clinical_flow', layer: 'core', maturity: 'live', whiteboardLink: 'patient_card_drawer' },
    egfr_calc: { suiteId: 'triage_reassessment_clinical_flow', layer: 'core', maturity: 'live', whiteboardLink: 'patient_card_drawer' },
    anion_gap: { suiteId: 'triage_reassessment_clinical_flow', layer: 'core', maturity: 'live', whiteboardLink: 'patient_card_drawer' },
    corrected_qt: { suiteId: 'triage_reassessment_clinical_flow', layer: 'core', maturity: 'preview', whiteboardLink: 'patient_card_drawer' },
    shock_index: { suiteId: 'triage_reassessment_clinical_flow', layer: 'core', maturity: 'live', whiteboardLink: 'patient_card_drawer' },
    vitals_history_chart: { suiteId: 'triage_reassessment_clinical_flow', layer: 'core', maturity: 'preview', whiteboardLink: 'patient_card_drawer' },
    lab_results_panel: { suiteId: 'triage_reassessment_clinical_flow', layer: 'core', maturity: 'preview', whiteboardLink: 'patient_card_drawer' },
    imaging_orders: { suiteId: 'triage_reassessment_clinical_flow', layer: 'core', maturity: 'preview', whiteboardLink: 'patient_card_drawer' },
    medication_history: { suiteId: 'triage_reassessment_clinical_flow', layer: 'core', maturity: 'preview', whiteboardLink: 'patient_card_drawer' },
    visit_history: { suiteId: 'triage_reassessment_clinical_flow', layer: 'core', maturity: 'preview', whiteboardLink: 'patient_card_drawer' },
    icd10_lookup: { suiteId: 'triage_reassessment_clinical_flow', layer: 'core', maturity: 'preview', whiteboardLink: 'patient_card_drawer' },

    ems_pipeline: {
      suiteId: 'ems_referral_boarding',
      layer: 'core',
      maturity: 'demo',
      whiteboardLink: 'board_workflow_panel',
      route: '/emergency/ems',
    },
    ems_pressure_score: { suiteId: 'ems_referral_boarding', layer: 'core', maturity: 'demo', whiteboardLink: 'board_workflow_panel' },
    ems_diversion: { suiteId: 'ems_referral_boarding', layer: 'core', maturity: 'planned', whiteboardLink: 'board_workflow_panel' },
    referral_intelligence: {
      suiteId: 'ems_referral_boarding',
      layer: 'core',
      maturity: 'demo',
      whiteboardLink: 'patient_card',
      route: '/emergency/referrals',
    },
    diagnostics_coordination: {
      suiteId: 'triage_reassessment_clinical_flow',
      layer: 'core',
      maturity: 'live',
      whiteboardLink: 'patient_card_drawer',
      route: '/emergency/diagnostics',
    },
    handoff_service: {
      suiteId: 'ems_referral_boarding',
      layer: 'core',
      maturity: 'live',
      whiteboardLink: 'board_workflow_panel',
      route: '/emergency/handoffs',
    },
    inter_facility_transfer: { suiteId: 'ems_referral_boarding', layer: 'core', maturity: 'planned', whiteboardLink: 'patient_card' },
    capacity_intelligence: {
      suiteId: 'ems_referral_boarding',
      layer: 'core',
      maturity: 'live',
      whiteboardLink: 'board_workflow_panel',
      route: '/emergency/capacity',
    },
    boarding_intelligence: {
      suiteId: 'ems_referral_boarding',
      layer: 'core',
      maturity: 'demo',
      whiteboardLink: 'patient_card',
      route: '/emergency/capacity?view=boarding',
    },

    ed_copilot: {
      suiteId: 'physician_clinical_copilot',
      layer: 'core',
      maturity: 'live',
      whiteboardLink: 'patient_card_drawer',
      route: '/emergency/copilot',
      notes: 'Case-aware workflow copilot; never autonomous clinician.',
    },
    copilot_tool_actions: { suiteId: 'physician_clinical_copilot', layer: 'core', maturity: 'demo', whiteboardLink: 'patient_card_drawer' },
    score_ai_assist: { suiteId: 'physician_clinical_copilot', layer: 'core', maturity: 'demo', whiteboardLink: 'patient_card_drawer' },
    protocol_suggest: { suiteId: 'physician_clinical_copilot', layer: 'core', maturity: 'demo', whiteboardLink: 'patient_card_drawer' },
    handoff_brief_gen: { suiteId: 'physician_clinical_copilot', layer: 'core', maturity: 'demo', whiteboardLink: 'role_view' },

    department_pulse: {
      suiteId: 'charge_nurse_command',
      layer: 'core',
      maturity: 'live',
      whiteboardLink: 'role_view',
      route: '/emergency/pulse',
    },
    shift_summary: {
      suiteId: 'charge_nurse_command',
      layer: 'core',
      maturity: 'live',
      whiteboardLink: 'board_workflow_panel',
      route: '/emergency/shift',
    },
    user_manual: {
      suiteId: 'charge_nurse_command',
      layer: 'core',
      maturity: 'live',
      whiteboardLink: 'role_view',
      route: '/emergency/help',
    },
    shift_analytics: { suiteId: 'charge_nurse_command', layer: 'core', maturity: 'demo', whiteboardLink: 'role_view' },

    emergency_analytics: {
      suiteId: 'analytics_simulation_qa',
      layer: 'core',
      maturity: 'demo',
      whiteboardLink: 'role_view',
      route: '/emergency/analytics',
    },
    operational_reports: {
      suiteId: 'analytics_simulation_qa',
      layer: 'core',
      maturity: 'live',
      whiteboardLink: 'role_view',
      route: '/emergency/reports',
    },
    simulation_engine: {
      suiteId: 'analytics_simulation_qa',
      layer: 'core',
      maturity: 'preview',
      whiteboardLink: 'suite_route',
      route: '/simulation',
    },
    export_shift_report: { suiteId: 'analytics_simulation_qa', layer: 'core', maturity: 'preview', whiteboardLink: 'role_view' },
    audit_log: { suiteId: 'analytics_simulation_qa', layer: 'core', maturity: 'live', whiteboardLink: 'platform_admin', route: '/audit' },

    fleet_management: {
      suiteId: 'fleet_ambulance_extension',
      layer: 'extension',
      maturity: 'demo',
      whiteboardLink: 'suite_route',
      route: '/fleet/command',
    },
    surveillance_nexus: {
      suiteId: 'telemetry_iot_digital_twin',
      layer: 'extension',
      maturity: 'demo',
      whiteboardLink: 'suite_route',
      route: '/surveillance/nexus',
    },
    cosmos_viewer: {
      suiteId: 'telemetry_iot_digital_twin',
      layer: 'extension',
      maturity: 'demo',
      whiteboardLink: 'none',
      route: '/cosmos',
    },

    emergency_settings: {
      suiteId: 'platform_admin_saas',
      layer: 'platform',
      maturity: 'live',
      whiteboardLink: 'platform_admin',
      route: '/emergency/settings',
    },
    feature_toggles_panel: { suiteId: 'platform_admin_saas', layer: 'platform', maturity: 'demo', whiteboardLink: 'platform_admin' },
    settings_thresholds: { suiteId: 'platform_admin_saas', layer: 'platform', maturity: 'demo', whiteboardLink: 'platform_admin' },
    room_management: { suiteId: 'platform_admin_saas', layer: 'platform', maturity: 'live', whiteboardLink: 'platform_admin' },
    staff_management: { suiteId: 'platform_admin_saas', layer: 'platform', maturity: 'live', whiteboardLink: 'platform_admin' },
    admin_console: { suiteId: 'platform_admin_saas', layer: 'platform', maturity: 'live', whiteboardLink: 'platform_admin', route: '/admin' },
    platform_navigation: { suiteId: 'platform_admin_saas', layer: 'platform', maturity: 'demo', whiteboardLink: 'none', route: '/workspace' },
    ai_command_center: { suiteId: 'platform_admin_saas', layer: 'platform', maturity: 'demo', whiteboardLink: 'none', route: '/ai-command-center' },

    integration_hub: {
      suiteId: 'integration_hub_automation',
      layer: 'platform',
      maturity: 'demo',
      whiteboardLink: 'platform_admin',
      route: '/integrations/hub',
    },
    integration_status: { suiteId: 'integration_hub_automation', layer: 'platform', maturity: 'demo', whiteboardLink: 'platform_admin' },
    laboratory: { suiteId: 'integration_hub_automation', layer: 'legacy', maturity: 'planned', whiteboardLink: 'none', route: '/laboratory' },
    knowledge_graph: { suiteId: 'integration_hub_automation', layer: 'legacy', maturity: 'planned', whiteboardLink: 'none', route: '/knowledge-graph' },

    native_ai_routing: {
      suiteId: 'physician_clinical_copilot',
      layer: 'core',
      maturity: 'demo',
      whiteboardLink: 'patient_card_drawer',
      route: '/emergency/copilot',
    },
    native_ai_drift_monitoring: {
      suiteId: 'analytics_simulation_qa',
      layer: 'core',
      maturity: 'demo',
      whiteboardLink: 'role_view',
      route: '/emergency/analytics',
    },
    nlp_triage_expert_system: {
      suiteId: 'reception_arrival',
      layer: 'core',
      maturity: 'demo',
      whiteboardLink: 'patient_card',
      route: '/emergency/reception',
    },
    post_ed_orientation: {
      suiteId: 'analytics_simulation_qa',
      layer: 'core',
      maturity: 'demo',
      whiteboardLink: 'patient_card',
    },
    voice_interview_assistant: {
      suiteId: 'reception_arrival',
      layer: 'core',
      maturity: 'preview',
      whiteboardLink: 'patient_card',
      route: '/emergency/reception',
    },
    ai_transparency_dashboard: {
      suiteId: 'physician_clinical_copilot',
      layer: 'core',
      maturity: 'demo',
      whiteboardLink: 'patient_card_drawer',
      route: '/emergency/whiteboard',
    },
    clinical_acuity_dashboard: {
      suiteId: 'emergency_whiteboard',
      layer: 'core',
      maturity: 'demo',
      whiteboardLink: 'board_queue_state',
      route: '/emergency/whiteboard',
    },
    patient_document_artifacts: {
      suiteId: 'physician_clinical_copilot',
      layer: 'core',
      maturity: 'demo',
      whiteboardLink: 'patient_card_drawer',
    },
    admission_prediction: {
      suiteId: 'charge_nurse_command',
      layer: 'core',
      maturity: 'demo',
      whiteboardLink: 'role_view',
      route: '/emergency/whiteboard',
    },
    journey_prediction: {
      suiteId: 'charge_nurse_command',
      layer: 'core',
      maturity: 'demo',
      whiteboardLink: 'role_view',
      route: '/emergency/whiteboard',
    },
    command_predictive_alerts: {
      suiteId: 'charge_nurse_command',
      layer: 'core',
      maturity: 'live',
      whiteboardLink: 'role_view',
      route: '/emergency/command-center',
    },
    patient_whiteboard: {
      suiteId: 'emergency_whiteboard',
      layer: 'core',
      maturity: 'live',
      whiteboardLink: 'patient_card',
      route: '/emergency/patient-room',
    },
    pre_arrival_activation: {
      suiteId: 'ems_referral_boarding',
      layer: 'core',
      maturity: 'demo',
      whiteboardLink: 'board_workflow_panel',
      route: '/emergency/ems',
    },
  });

export const NAV_SUITE_ASSIGNMENTS: Readonly<Record<string, CareDroidSuiteId>> = Object.freeze({
  reception: 'reception_arrival',
  collaboration: 'charge_nurse_command',
  'command-center': 'emergency_whiteboard',
  whiteboard: 'emergency_whiteboard',
  intake: 'reception_arrival',
  dispatch: 'ems_referral_boarding',
  'ed-readiness': 'ems_referral_boarding',
  alerts: 'analytics_simulation_qa',
  ems: 'ems_referral_boarding',
  patients: 'emergency_whiteboard',
  queues: 'emergency_whiteboard',
  triage: 'triage_reassessment_clinical_flow',
  reassessment: 'triage_reassessment_clinical_flow',
  capacity: 'ems_referral_boarding',
  boarding: 'ems_referral_boarding',
  referrals: 'ems_referral_boarding',
  diagnostics: 'triage_reassessment_clinical_flow',
  handoffs: 'ems_referral_boarding',
  copilot: 'physician_clinical_copilot',
  tools: 'triage_reassessment_clinical_flow',
  analytics: 'analytics_simulation_qa',
  reports: 'analytics_simulation_qa',
  settings: 'platform_admin_saas',
  integrations: 'integration_hub_automation',
  cosmos: 'telemetry_iot_digital_twin',
  platform: 'platform_admin_saas',
  pulse: 'charge_nurse_command',
  shift: 'charge_nurse_command',
  help: 'charge_nurse_command',
  fleet: 'fleet_ambulance_extension',
  surveillance: 'telemetry_iot_digital_twin',
  simulation: 'analytics_simulation_qa',
  laboratory: 'integration_hub_automation',
  knowledge: 'integration_hub_automation',
  audit: 'analytics_simulation_qa',
  'ai-center': 'platform_admin_saas',
  admin: 'platform_admin_saas',
  'hospital-map': 'telemetry_iot_digital_twin',
  executive: 'analytics_simulation_qa',
  'predictive-analytics': 'analytics_simulation_qa',
  'medical-iot': 'telemetry_iot_digital_twin',
});

export function getSuiteById(id: CareDroidSuiteId): CareDroidSuite | undefined {
  return CAREDROID_SUITES.find((suite) => suite.id === id);
}

export function getFeatureSuiteAssignment(featureId: string): FeatureSuiteAssignment | undefined {
  return FEATURE_SUITE_ASSIGNMENTS[featureId];
}

export function getNavSuiteId(navItemId: string): CareDroidSuiteId | undefined {
  return NAV_SUITE_ASSIGNMENTS[navItemId];
}

export function listFeaturesBySuite(suiteId: CareDroidSuiteId): string[] {
  return Object.entries(FEATURE_SUITE_ASSIGNMENTS)
    .filter(([, assignment]) => assignment.suiteId === suiteId)
    .map(([featureId]) => featureId);
}
