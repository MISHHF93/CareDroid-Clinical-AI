/**
 * Shared assertions for calculator deep links (CALCULATOR_ROUTE_DEFS + App.jsx spread).
 */

import { expect } from 'vitest';
import { CALCULATOR_ROUTE_DEFS } from '../../routes/clinicalToolRoutes';

/**
 * @param {string} appSource
 * @param {string[]} registryIds - calculatorSlug values
 */
export function assertAppCalculatorRouteWiring(appSource, registryIds) {
  expect(appSource).toContain('CALCULATOR_ROUTE_DEFS.map');
  expect(appSource).toContain('initialCalculatorId={calculatorSlug}');

  const spreadIdx = appSource.indexOf('...CALCULATOR_ROUTE_DEFS.map');
  const hubIdx = appSource.indexOf("path: '/tools/calculators'");
  expect(spreadIdx).toBeGreaterThan(-1);
  expect(hubIdx).toBeGreaterThan(spreadIdx);

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
