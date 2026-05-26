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
    heading: /caredroid command dashboard/i,
  },
  { id: 'assistant', path: '/assistant', match: 'composer' },
  { id: 'operations', path: '/operations', match: 'heading', heading: /^operations$/i },
  { id: 'tools-overview', path: '/tools', match: 'heading', heading: /^tool library$/i },
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
    heading: /interoperability hub/i,
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
    id: 'governance-platform',
    path: '/governance',
    match: 'heading',
    heading: /governance hub/i,
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
