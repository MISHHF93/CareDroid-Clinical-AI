/**
 * Major routes exercised by responsive regression smoke tests.
 * Aligns with `src/data/responsiveQaMatrix.js` and Playwright QA.
 */

import { TIER_A_CALCULATOR_PATH_BY_REGISTRY_ID } from '../data/responsiveQaMatrix.js';
import { CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS } from '../data/clinicalToolIdContract.js';
import { CALCULATOR_ROUTE_DEFS } from '../routes/clinicalToolRoutes.js';

/** Core and fleet paths rendered in route smoke tests. */
export const CORE_ROUTE_SMOKE = Object.freeze([
  {
    id: 'dashboard',
    path: '/dashboard',
    match: 'heading',
    heading: /caredroid command center/i,
  },
  { id: 'discover', path: '/discover', match: 'heading', heading: /discover caredroid capabilities/i },
  { id: 'automation', path: '/automation', match: 'heading', heading: /^automation$/i },
  { id: 'assistant', path: '/assistant', match: 'composer' },
  { id: 'operations-center', path: '/operations-center', match: 'heading', heading: /digital operations center/i },
  { id: 'tools-overview', path: '/tools', match: 'heading', heading: /^tool library$/i },
  { id: 'protocols', path: '/protocols', match: 'heading', heading: /protocol and clinical pathway library/i },
  { id: 'research', path: '/research', match: 'heading', heading: /research and evidence hub/i },
  { id: 'documentation', path: '/documentation', match: 'heading', heading: /clinical documentation assistant/i },
  { id: 'knowledge-graph', path: '/knowledge-graph', match: 'heading', heading: /clinical knowledge graph/i },
  { id: 'predictive-analytics', path: '/predictive-analytics', match: 'heading', heading: /predictive analytics dashboard/i },
  {
    id: 'clinical-decision-support',
    path: '/clinical-decision-support',
    match: 'heading',
    heading: /clinical decision support engine/i,
  },
  { id: 'competencies', path: '/competencies', match: 'heading', heading: /competency platform/i },
  { id: 'credentials', path: '/credentials', match: 'heading', heading: /credentialing platform/i },
  { id: 'simulation', path: '/simulation', match: 'heading', heading: /medical simulation suite/i },
  {
    id: 'simulation-scenario',
    path: '/simulation/sepsis-deterioration',
    match: 'heading',
    heading: /sepsis deterioration/i,
  },
  {
    id: 'simulation-outcomes',
    path: '/simulation/outcomes',
    match: 'heading',
    heading: /simulation outcomes/i,
  },
  { id: 'laboratory', path: '/laboratory', match: 'heading', heading: /^laboratory$/i },
  { id: '3d-viewer', path: '/3d-viewer', match: 'heading', heading: /^3d viewer$/i },
  { id: 'live-map', path: '/live-map', match: 'heading', heading: /^live tracking map$/i },
  { id: 'hospital-map', path: '/hospital-map', match: 'heading', heading: /^hospital map$/i },
  { id: 'medical-iot', path: '/medical-iot', match: 'heading', heading: /medical iot dashboard/i },
  { id: 'devices', path: '/devices', match: 'heading', heading: /device fleet management/i },
  {
    id: 'clinical-alerts',
    path: '/clinical/alerts',
    match: 'heading',
    heading: /clinical alerts management/i,
  },
  {
    id: 'tools-catalog',
    path: '/tools/catalog',
    match: 'heading',
    heading: /developer catalog \/ source audit/i,
  },
  {
    id: 'calculators-hub',
    path: '/tools/calculators',
    match: 'heading',
    heading: /medical calculators/i,
  },
  {
    id: 'ambient-scribe',
    path: '/tools/ambient-scribe',
    match: 'heading',
    heading: /ambient clinical scribe/i,
  },
  {
    id: 'calculator-recommender-ai',
    path: '/tools/calculator-recommender',
    match: 'heading',
    heading: /calculator recommendation ai/i,
  },
  {
    id: 'guideline-rag',
    path: '/tools/guideline-rag',
    match: 'heading',
    heading: /guideline retrieval \+ evidence engine/i,
  },
  {
    id: 'differential-ai',
    path: '/tools/differential-ai',
    match: 'heading',
    heading: /differential diagnosis assistant/i,
  },
  {
    id: 'timeline-ai',
    path: '/tools/timeline-ai',
    match: 'heading',
    heading: /patient timeline ai/i,
  },
  {
    id: 'patient-summary-ai',
    path: '/tools/patient-summary-ai',
    match: 'heading',
    heading: /patient summary ai/i,
  },
  {
    id: 'order-set-ai',
    path: '/tools/order-set-ai',
    match: 'heading',
    heading: /intelligent order set assistant/i,
  },
  {
    id: 'ai-explainability',
    path: '/tools/ai-explainability',
    match: 'heading',
    heading: /ai explainability/i,
  },
  {
    id: 'clinical-audit',
    path: '/tools/clinical-audit',
    match: 'heading',
    heading: /clinical audit/i,
  },
  { id: 'artifacts', path: '/artifacts', match: 'heading', heading: /caredroid artifacts/i },
  { id: 'memory', path: '/memory', match: 'heading', heading: /memory dashboard/i },
  { id: 'training', path: '/training', match: 'heading', heading: /training dashboard/i },
  { id: 'analytics', path: '/analytics', match: 'heading', heading: /platform analytics/i },
  { id: 'feature-flags', path: '/feature-flags', match: 'heading', heading: /feature flag center/i },
  { id: 'plugins', path: '/plugins', match: 'heading', heading: /plugin marketplace/i },
  { id: 'dependency-map', path: '/dependency-map', match: 'heading', heading: /platform wiring map/i },
  { id: 'data-lineage', path: '/data-lineage', match: 'heading', heading: /data lineage explorer/i },
  { id: 'self-diagnostics', path: '/self-diagnostics', match: 'heading', heading: /platform self-diagnostics/i },
  { id: 'costs', path: '/costs', match: 'heading', heading: /cost analytics/i },
  { id: 'ai-evaluation', path: '/ai/evaluation', match: 'heading', heading: /^ai evaluation$/i },
  {
    id: 'ai-command-center',
    path: '/ai-command-center',
    match: 'heading',
    heading: /^ai command center$/i,
  },
  {
    id: 'integrations-platform',
    path: '/integrations',
    match: 'heading',
    heading: /fhir \+ hl7 integration/i,
  },
  {
    id: 'workflow-builder-ai',
    path: '/tools/workflow-builder-ai',
    match: 'heading',
    heading: /workflow builder ai/i,
  },
  {
    id: 'patient-workspace-platform',
    path: '/patients/demo-patient/workspace',
    match: 'heading',
    heading: /patient workspace/i,
  },
  {
    id: 'soap-builder',
    path: '/tools/soap-builder',
    match: 'heading',
    heading: /soap builder/i,
  },
  {
    id: 'ai-governance-center',
    path: '/ai-governance',
    match: 'heading',
    heading: /ai governance center/i,
  },
  {
    id: 'llm-security-dashboard',
    path: '/security',
    match: 'heading',
    heading: /llm security dashboard/i,
  },
  {
    id: 'regulatory-enterprise',
    path: '/regulatory',
    match: 'heading',
    heading: /regulatory classification/i,
  },
  {
    id: 'equity-monitoring-enterprise',
    path: '/equity',
    match: 'heading',
    heading: /bias and equity monitoring/i,
  },
  {
    id: 'human-review-enterprise',
    path: '/human-review',
    match: 'heading',
    heading: /human review queue/i,
  },
  {
    id: 'privacy-enterprise',
    path: '/privacy',
    match: 'heading',
    heading: /consent \+ privacy center/i,
  },
  {
    id: 'system-health-enterprise',
    path: '/system-health',
    match: 'heading',
    heading: /deployment observability/i,
  },
  {
    id: 'governance-platform',
    path: '/governance',
    match: 'heading',
    heading: /clinical governance/i,
  },
  {
    id: 'governance-clinical',
    path: '/governance/clinical',
    match: 'heading',
    heading: /clinical governance/i,
  },
  {
    id: 'ai-security-platform',
    path: '/governance/ai-security',
    match: 'heading',
    heading: /ai security/i,
  },
  {
    id: 'regulatory-classification',
    path: '/governance/regulatory',
    match: 'heading',
    heading: /regulatory classification/i,
  },
  {
    id: 'validation-sandbox',
    path: '/governance/validation',
    match: 'heading',
    heading: /validation sandbox/i,
  },
  {
    id: 'human-review-queue',
    path: '/review',
    match: 'heading',
    heading: /human review queue/i,
  },
  {
    id: 'audit-trail-spine',
    path: '/audit',
    match: 'heading',
    heading: /audit trail spine/i,
  },
  {
    id: 'deployment-observability',
    path: '/operations/observability',
    match: 'heading',
    heading: /deployment observability/i,
  },
  { id: 'fleet-live-map', path: '/fleet/map', match: 'heading', heading: /fleet live map/i },
  { id: 'fleet-command', path: '/fleet/command', match: 'fleet-summary' },
  {
    id: 'fleet-route-optimizer',
    path: '/fleet/route-optimizer',
    match: 'heading',
    heading: /route optimization/i,
  },
  {
    id: 'fleet-predictive-maintenance',
    path: '/fleet/predictive-maintenance',
    match: 'heading',
    heading: /predictive maintenance/i,
  },
]);

/** Representative Tier-A calculator slugs for form smoke (one per PR slice). */
export const TIER_A_FORM_SMOKE_SLUGS = Object.freeze([
  { slug: 'qsofa', registryId: 'qsofa', interfaceClass: 'calculator-interface--qsofa' },
  { slug: 'news2', registryId: 'news2', interfaceClass: 'calculator-interface--news2' },
  { slug: 'has-bled', registryId: 'has-bled', interfaceClass: 'calculator-interface--has-bled' },
  { slug: 'phq9', registryId: 'phq9', interfaceClass: 'calculator-interface--phq9' },
  {
    slug: 'ascvd-risk',
    registryId: 'ascvd-risk',
    interfaceClass: 'calculator-interface--ascvd-risk',
  },
]);

/** Every Tier-A path is registered in App routing. */
export function getAllTierARoutePaths() {
  return CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS.map(
    (id) => TIER_A_CALCULATOR_PATH_BY_REGISTRY_ID[id]
  ).filter(Boolean);
}

export const CALCULATOR_ROUTE_PATHS = Object.freeze(CALCULATOR_ROUTE_DEFS.map((d) => d.path));
