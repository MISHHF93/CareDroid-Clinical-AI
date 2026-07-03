/**
 * Canonical emergency platform configuration barrel.
 * Import from here instead of scattering across 50+ config modules.
 */
export { CANONICAL_ROUTES } from './routes.config';
export { EMERGENCY_OS_API_ENDPOINTS, ACTIVE_EMERGENCY_OS_API_ENDPOINT_KEYS } from '../services/emergencyOsApi';
export {
  WORKFLOW_AUTOMATION_DOMAINS,
  WORKFLOW_AUTOMATION_TRIGGER_EVENTS,
  UNIFIED_WORKFLOW_SAFETY_STATEMENT,
  UNIFIED_WORKFLOW_AUTOMATION_CONTRACT,
} from './unifiedWorkflowAutomationModel';
export {
  AI_CHIEF_MONITORING_DOMAINS,
  AI_CHIEF_SAFETY_STATEMENT,
  AI_CHIEF_ORCHESTRATION_CONTRACT,
} from './aiChiefOrchestrationModel';
export {
  ADMINISTRATIVE_AUTOMATION_CATEGORIES,
  ADMINISTRATIVE_AUTOMATION_SAFETY_STATEMENT,
} from './administrativeAutomationCatalog';
export { ED_JOURNEY_PHASES, ED_OPERATING_SURFACES } from './edOperatingSurface.config';
export { listHospitalDepartments, resolvePatientJourneyPosition } from './hospitalOperatingSystemModel';
export { EMERGENCY_OS_BRANDING } from './emergencyOsBranding.config';

export {
  PATIENT_WORKFLOW_STEPS,
  UNIFIED_PATIENT_WORKFLOW_CONTRACT,
  listPatientWorkflowSteps,
  resolveWorkflowRouteForState,
  resolveWorkflowStepForState,
} from './unifiedPatientWorkflowModel';
export {
  UNIFIED_OPERATIONAL_INTELLIGENCE_DOMAINS,
  UNIFIED_OPERATIONAL_INTELLIGENCE_TRIGGER_EVENTS,
  UNIFIED_OPERATIONAL_INTELLIGENCE_CONTRACT,
} from './unifiedOperationalIntelligenceModel';
export {
  KNOWLEDGE_GRAPH_ENTITY_TYPES,
  KNOWLEDGE_GRAPH_RELATIONSHIP_TYPES,
  UNIFIED_APPLICATION_KNOWLEDGE_GRAPH_CONTRACT,
} from './unifiedApplicationKnowledgeGraphModel';
export { LIVING_DOCUMENTATION_CONTRACT } from './livingDocumentationModel';
export { LIVING_CONTEXTUAL_HELP_ENTRIES } from './livingDocumentationContextualHelp';
export {
  CANONICAL_CONFIGURATION_CONTRACT,
  CANONICAL_CONFIGURATION_REGISTRY,
} from './canonicalConfigurationModel';
export { OBSERVABILITY_CONTRACT } from './observabilityModel';
export { SECURITY_CONTRACT } from './securityModel';
export { PLATFORM_COHESION_CONTRACT } from './platformCohesionModel';

export const EMERGENCY_PLATFORM_CONTRACT = Object.freeze({
  apiFacade: 'emergencyOsApi',
  workflowEngine: 'unified-workflow-automation',
  adminAutomationEngine: 'unified-clinical-workflow-orchestrator',
  aiChiefEngine: 'ai-chief-orchestrator',
  patientWorkflowEngine: 'unified-patient-workflow-orchestrator',
  operationalIntelligenceEngine: 'unified-operational-intelligence',
  knowledgeGraphEngine: 'unified-application-knowledge-graph',
  livingDocumentationEngine: 'living-documentation',
  observabilityEngine: 'caredroid-observability',
  securityEngine: 'caredroid-security',
  cohesionEngine: 'caredroid-platform-cohesion',
  envelopeParser: 'emergencyApiHelpers.unwrapEmergencyEnvelope',
  humanOversightRequired: true,
});