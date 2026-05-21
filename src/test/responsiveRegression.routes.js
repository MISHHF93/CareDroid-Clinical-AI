/**
 * Major routes exercised by responsive regression smoke tests.
 * Aligns with `src/data/responsiveQaMatrix.js` and Playwright QA.
 */

import { TIER_A_CALCULATOR_PATH_BY_REGISTRY_ID } from '../data/responsiveQaMatrix.js';
import { CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS } from '../data/clinicalToolIdContract.js';
import { CALCULATOR_ROUTE_DEFS } from '../routes/clinicalToolRoutes.js';

/** Core and fleet paths rendered in route smoke tests. */
export const CORE_ROUTE_SMOKE = Object.freeze([
  { id: 'dashboard', path: '/dashboard', match: 'heading', heading: /pulse/i },
  { id: 'chat', path: '/chat', match: 'composer' },
  { id: 'tools-overview', path: '/tools', match: 'heading', heading: /action library/i },
  { id: 'tools-catalog', path: '/tools/catalog', match: 'heading', heading: /developer catalog \/ source audit/i },
  { id: 'calculators-hub', path: '/tools/calculators', match: 'heading', heading: /medical calculators/i },
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
  { slug: 'ascvd-risk', registryId: 'ascvd-risk', interfaceClass: 'calculator-interface--ascvd-risk' },
]);

/** Every Tier-A path is registered in App routing. */
export function getAllTierARoutePaths() {
  return CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS.map(
    (id) => TIER_A_CALCULATOR_PATH_BY_REGISTRY_ID[id]
  ).filter(Boolean);
}

export const CALCULATOR_ROUTE_PATHS = Object.freeze(CALCULATOR_ROUTE_DEFS.map((d) => d.path));
