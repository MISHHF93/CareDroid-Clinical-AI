/**
 * Major routes exercised by responsive regression smoke tests.
 * Aligns with `src/data/responsiveQaMatrix.js` and Playwright QA.
 */

import { TIER_A_CALCULATOR_PATH_BY_REGISTRY_ID } from '../data/responsiveQaMatrix';
import { CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS } from '../data/clinicalToolIdContract';
import { CALCULATOR_ROUTE_DEFS } from '../routes/clinicalToolRoutes';

/** Core and fleet paths rendered in route smoke tests. */
export const CORE_ROUTE_SMOKE = Object.freeze([
  {
    id: 'dashboard',
    path: '/dashboard',
    match: 'heading-text',
    heading: /careDroid command center/i,
  },
  {
    id: 'executive',
    path: '/executive',
    // CareDroidPage-based (HEAL-185): registers its title into the shell chrome instead of
    // rendering its own <h1>.
    match: 'heading-text',
    heading: /executive command center/i,
  },
  {
    id: 'discover',
    path: '/discover',
    match: 'heading-text',
    heading: /discover caredroid capabilities/i,
  },
  { id: 'workflows', path: '/workflows', match: 'heading-text', heading: /^workflows$/i },
  { id: 'operations', path: '/operations', match: 'heading-text', heading: /default operations/i },
  // CareDroidPage-based (HEAL-185): these register their title into the shell chrome instead of
  // rendering their own <h1> -- match on text, not heading role (mirrors PlatformGovernanceWorkspace's
  // established 'heading-text' pattern from HEAL-169).
  {
    id: 'tools-overview',
    path: '/tools',
    match: 'heading-text',
    heading: /careDroid tool console/i,
  },
  {
    id: 'protocols',
    path: '/protocols',
    match: 'heading-text',
    heading: /protocol and clinical pathway library/i,
  },
  {
    id: 'research',
    path: '/research',
    match: 'heading-text',
    heading: /research and evidence hub/i,
  },
  // 'heading-text', like every other page whose <h1> the shell owns. These smoke
  // tests render the page without the shell, so requiring a level-1 heading here
  // asserted something the page deliberately does not render on its own.
  {
    id: 'documentation',
    path: '/documentation',
    match: 'heading-text',
    heading: /clinical documentation assistant/i,
  },
  {
    id: 'knowledge-graph',
    path: '/knowledge-graph',
    match: 'heading-text',
    heading: /clinical knowledge graph/i,
  },
  {
    id: 'predictive-analytics',
    path: '/predictive-analytics',
    match: 'heading-text',
    heading: /predictive analytics dashboard/i,
  },
  {
    id: 'clinical-decision-support',
    path: '/clinical-decision-support',
    match: 'heading-text',
    heading: /clinical decision support engine/i,
  },
  {
    id: 'competencies',
    path: '/competencies',
    match: 'heading-text',
    heading: /competency platform/i,
  },
  {
    id: 'credentials',
    path: '/credentials',
    match: 'heading-text',
    heading: /credentialing platform/i,
  },
  {
    id: 'simulation',
    path: '/simulation',
    match: 'heading-text',
    heading: /medical simulation suite/i,
  },
  {
    id: 'simulation-scenario',
    path: '/simulation/sepsis-deterioration',
    match: 'heading-text',
    heading: /sepsis deterioration/i,
  },
  {
    id: 'simulation-outcomes',
    path: '/simulation/outcomes',
    match: 'heading-text',
    heading: /simulation outcomes/i,
  },
  { id: 'laboratory', path: '/laboratory', match: 'heading-text', heading: /^laboratory$/i },
  { id: '3d-viewer', path: '/3d-viewer', match: 'heading-text', heading: /^3d viewer$/i },
  { id: 'live-map', path: '/live-map', match: 'heading-text', heading: /^live tracking map$/i },
  { id: 'hospital-map', path: '/hospital-map', match: 'heading-text', heading: /^hospital map$/i },
  {
    id: 'medical-iot',
    path: '/medical-iot',
    match: 'heading-text',
    heading: /medical iot dashboard/i,
  },
  { id: 'devices', path: '/devices', match: 'heading-text', heading: /device fleet management/i },
  {
    id: 'clinical-alerts',
    // Renders through EmergencyRoutePage, which registers its title with the shell
    // chrome; the page itself emits the sr-only cd-page-title-text mirror instead
    // of a second <h1>. Same reason as /documentation above.
    path: '/clinical/alerts',
    match: 'heading-text',
    heading: /^critical alerts$/i,
  },

  {
    id: 'calculators-library-filter',
    path: '/tools/calculators',
    match: 'heading-text',
    heading: /careDroid tool console/i,
  },
  {
    id: 'ambient-scribe',
    path: '/tools/ambient-scribe',
    match: 'heading-text',
    heading: /ambient clinical scribe/i,
  },
  {
    id: 'calculator-recommender-ai',
    path: '/tools/calculator-recommender',
    match: 'heading-text',
    heading: /calculator recommendation ai/i,
  },
  {
    id: 'guideline-rag',
    path: '/tools/guideline-rag',
    match: 'heading-text',
    heading: /guideline retrieval \+ evidence engine/i,
  },
  {
    id: 'differential-ai',
    path: '/tools/differential-ai',
    match: 'heading-text',
    heading: /differential diagnosis assistant/i,
  },
  {
    id: 'timeline-ai',
    path: '/tools/timeline-ai',
    match: 'heading-text',
    heading: /patient timeline ai/i,
  },
  {
    id: 'patient-summary-ai',
    path: '/tools/patient-summary-ai',
    match: 'heading-text',
    heading: /patient summary ai/i,
  },
  {
    id: 'order-set-ai',
    path: '/tools/order-set-ai',
    match: 'heading-text',
    heading: /intelligent order set assistant/i,
  },
  {
    id: 'ai-explainability',
    path: '/tools/ai-explainability',
    match: 'heading-text',
    heading: /ai explainability/i,
  },
  {
    id: 'clinical-audit',
    path: '/tools/clinical-audit',
    match: 'heading-text',
    heading: /clinical audit/i,
  },
  { id: 'artifacts', path: '/artifacts', match: 'heading-text', heading: /caredroid artifacts/i },
  { id: 'memory', path: '/memory', match: 'heading-text', heading: /memory dashboard/i },
  { id: 'training', path: '/training', match: 'heading-text', heading: /ai operations dashboard/i },
  { id: 'analytics', path: '/analytics', match: 'heading-text', heading: /platform analytics/i },
  {
    id: 'knowledge-hub',
    path: '/knowledge-hub',
    match: 'heading-text',
    heading: /knowledge hub/i,
  },
  {
    id: 'workflow-mining',
    path: '/workflow-mining',
    match: 'heading-text',
    heading: /workflow mining/i,
  },
  {
    id: 'workspace-dependency-graph',
    path: '/workspace-dependency-graph',
    match: 'heading-text',
    heading: /workspace dependency graph/i,
  },
  {
    id: 'organization-intelligence',
    path: '/organization-intelligence',
    match: 'heading-text',
    heading: /organization intelligence/i,
  },
  {
    id: 'department-intelligence',
    path: '/department-intelligence',
    match: 'heading-text',
    heading: /department intelligence/i,
  },
  {
    id: 'product-intelligence',
    path: '/product-intelligence',
    match: 'heading-text',
    heading: /product intelligence/i,
  },
  {
    id: 'expansion-opportunities',
    path: '/expansion-opportunities',
    match: 'heading-text',
    heading: /expansion opportunities/i,
  },
  {
    id: 'maturity-assessment',
    path: '/maturity-assessment',
    match: 'heading-text',
    heading: /hospital maturity assessment/i,
  },
  {
    id: 'feature-flags',
    path: '/feature-flags',
    match: 'heading-text',
    heading: /feature flag center/i,
  },
  { id: 'plugins', path: '/plugins', match: 'heading-text', heading: /plugin marketplace/i },
  {
    id: 'dependency-map',
    path: '/dependency-map',
    match: 'heading-text',
    heading: /platform wiring map/i,
  },
  {
    id: 'dependency-graph',
    path: '/dependency-graph',
    match: 'heading-text',
    heading: /asset dependency graph/i,
  },
  {
    id: 'data-lineage',
    path: '/data-lineage',
    match: 'heading-text',
    heading: /data lineage explorer/i,
  },
  {
    id: 'self-diagnostics',
    path: '/self-diagnostics',
    match: 'heading-text',
    heading: /platform self-diagnostics/i,
  },
  { id: 'costs', path: '/costs', match: 'heading-text', heading: /cost analytics/i },
  {
    id: 'ai-evaluation',
    path: '/ai-evaluation',
    match: 'heading-text',
    heading: /ai evaluation lab/i,
  },
  {
    id: 'ai-command-center',
    path: '/ai-command-center',
    match: 'heading-text',
    heading: /^ai command center$/i,
  },
  {
    id: 'business-brain',
    path: '/business-brain',
    match: 'heading-text',
    heading: /business brain/i,
  },
  {
    id: 'integrations-platform',
    path: '/integrations',
    match: 'heading-text',
    heading: /fhir \+ hl7 integration/i,
  },
  {
    id: 'workflow-builder-ai',
    path: '/tools/workflow-builder-ai',
    match: 'heading-text',
    heading: /workflow builder ai/i,
  },
  {
    id: 'patient-workspace-platform',
    path: '/patients/demo-patient/workspace',
    match: 'heading-text',
    heading: /patient workspace/i,
  },
  {
    id: 'soap-builder',
    path: '/tools/soap-builder',
    match: 'heading-text',
    heading: /soap builder/i,
  },
  {
    id: 'ai-governance-center',
    path: '/ai-governance',
    match: 'heading-text',
    heading: /ai governance center/i,
  },
  {
    id: 'llm-security-dashboard',
    path: '/security',
    match: 'heading-text',
    heading: /llm security dashboard/i,
  },
  {
    id: 'regulatory-enterprise',
    path: '/regulatory',
    match: 'heading-text',
    heading: /regulatory classification/i,
  },
  {
    id: 'equity-monitoring-enterprise',
    path: '/equity',
    match: 'heading-text',
    heading: /bias and equity monitoring/i,
  },
  {
    id: 'human-review-enterprise',
    path: '/human-review',
    match: 'heading-text',
    heading: /human review queue/i,
  },
  {
    id: 'privacy-enterprise',
    path: '/privacy',
    match: 'heading-text',
    heading: /consent \+ privacy center/i,
  },
  {
    id: 'system-health-enterprise',
    path: '/system-health',
    match: 'heading-text',
    heading: /deployment observability/i,
  },
  {
    id: 'saas-health-enterprise',
    path: '/saas-health',
    match: 'heading-text',
    heading: /saas health center/i,
  },
  {
    id: 'governance-registry-enterprise',
    path: '/governance-registry',
    match: 'heading-text',
    heading: /platform governance registry/i,
  },
  {
    id: 'governance-platform',
    path: '/governance',
    match: 'heading-text',
    heading: /clinical governance/i,
  },
  {
    id: 'governance-clinical',
    path: '/governance/clinical',
    match: 'heading-text',
    heading: /clinical governance/i,
  },
  {
    id: 'ai-security-platform',
    path: '/governance/ai-security',
    match: 'heading-text',
    heading: /ai security/i,
  },
  {
    id: 'regulatory-classification',
    path: '/governance/regulatory',
    match: 'heading-text',
    heading: /regulatory classification/i,
  },
  {
    id: 'validation-sandbox',
    path: '/governance/validation',
    match: 'heading-text',
    heading: /validation sandbox/i,
  },
  {
    id: 'human-review-queue',
    path: '/review',
    match: 'heading-text',
    heading: /human review queue/i,
  },
  {
    id: 'audit-trail-spine',
    path: '/audit',
    match: 'heading-text',
    heading: /audit trail spine/i,
  },
  {
    id: 'deployment-observability',
    path: '/operations/observability',
    match: 'heading-text',
    heading: /deployment observability/i,
  },
  { id: 'fleet-live-map', path: '/fleet/map', match: 'heading-text', heading: /fleet live map/i },
  { id: 'fleet-command', path: '/fleet/command', match: 'fleet-summary' },
  {
    id: 'fleet-route-optimizer',
    path: '/fleet/route-optimizer',
    match: 'heading-text',
    heading: /route optimization/i,
  },
  {
    id: 'fleet-predictive-maintenance',
    path: '/fleet/predictive-maintenance',
    match: 'heading-text',
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
    (id) => TIER_A_CALCULATOR_PATH_BY_REGISTRY_ID[id],
  ).filter(Boolean);
}

export const CALCULATOR_ROUTE_PATHS = Object.freeze(CALCULATOR_ROUTE_DEFS.map((d) => d.path));
