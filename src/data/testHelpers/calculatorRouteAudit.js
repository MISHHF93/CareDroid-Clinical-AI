/**
 * Shared assertions for calculator deep links.
 *
 * `CALCULATOR_ROUTE_DEFS` remains the historical inventory/index for calculator slugs. App.jsx no
 * longer mounts calculator routes in the active CareDroid-only product surface.
 */

import { expect } from 'vitest';
import { CALCULATOR_ROUTE_DEFS } from '../../routes/clinicalToolRoutes';

/**
 * @param {string} appSource
 * @param {string[]} registryIds - calculatorSlug values
 */
export function assertAppCalculatorRouteWiring(appSource, registryIds) {
  expect(appSource).not.toContain('CALCULATOR_ROUTE_DEFS.map');
  expect(appSource).not.toContain('initialCalculatorId={calculatorSlug}');
  expect(appSource).not.toContain('<LegacyCalculatorRouteRedirect />');
  expect(appSource).toContain('<Route path="/tools/*" element={<ToolsRedirect />} />');

  for (const id of registryIds) {
    const def = CALCULATOR_ROUTE_DEFS.find((d) => d.calculatorSlug === id);
    expect(def, `CALCULATOR_ROUTE_DEFS missing ${id}`).toBeTruthy();
    expect(def.path).toMatch(/^\/tools\/calculators\//);
  }
}

/**
 * @param {Set<string>} pathSet
 * @returns {string[]}
 */
export function registeredCalculatorPathsForSet(pathSet) {
  return CALCULATOR_ROUTE_DEFS.filter((d) => pathSet.has(d.path))
    .map((d) => d.path)
    .sort();
}

/**
 * @param {string} registryId
 * @param {number} appSource
 */
export function assertDedicatedRouteBeforeHub(appSource, registryId) {
  assertAppCalculatorRouteWiring(appSource, [registryId]);
}
