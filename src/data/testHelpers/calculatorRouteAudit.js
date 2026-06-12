/**
 * Shared assertions for calculator deep links.
 *
 * `CALCULATOR_ROUTE_DEFS` remains the inventory/index for calculator slugs. App.jsx now keeps
 * one mounted calculator redirect surface that opens the active ED Copilot workflow.
 */

import { expect } from 'vitest';
import { CALCULATOR_ROUTE_DEFS } from '../../routes/clinicalToolRoutes';

/**
 * @param {string} appSource
 * @param {string[]} registryIds - calculatorSlug values
 */
export function assertAppCalculatorRouteWiring(appSource, registryIds) {
  const hubIdx = appSource.indexOf("path: '/tools/calculators'");
  const slugRedirectIdx = appSource.indexOf("path: '/tools/calculators/:slug'");
  expect(appSource).not.toContain('CALCULATOR_ROUTE_DEFS.map');
  expect(appSource).not.toContain('initialCalculatorId={calculatorSlug}');
  expect(hubIdx).toBeGreaterThan(-1);
  expect(slugRedirectIdx).toBeGreaterThan(hubIdx);
  expect(appSource).toContain('<LegacyCalculatorRouteRedirect />');

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
