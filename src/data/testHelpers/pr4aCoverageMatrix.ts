/**
 * Reusable deterministic assertions for PR4A ten-area Vitest coverage.
 */

import { expect } from 'vitest';
import { PR4A_HUB_PATH, PR4A_ROUTE_BY_REGISTRY_ID } from '../pr4aTestConstants';

export { PR4A_HUB_PATH, PR4A_ROUTE_BY_REGISTRY_ID };

/**
 * @param {Array<[string, string]>} pairs
 */
export function expectUniqueAliasPairs(pairs) {
  const byAlias = new Map();
  for (const [alias, canonical] of pairs) {
    expect(byAlias.get(alias), `duplicate alias key "${alias}"`).toBeUndefined();
    byAlias.set(alias, canonical);
  }
}

/**
 * @param {string} id
 * @param {{
 *   toolRegistry: Array<{ id: string }>,
 *   toolRegistryById: Record<string, { id?: string, panelTool?: string, path?: string, initialCalc?: string }>,
 *   getToolIcon: (id: string) => unknown,
 * }} ctx
 */
export function assertPr4aRegistryRow(id, { toolRegistry, toolRegistryById, getToolIcon }) {
  expect(toolRegistry.filter((t) => t.id === id)).toHaveLength(1);
  const reg = toolRegistryById[id];
  expect(reg?.id).toBe(id);
  expect(reg.panelTool).toBe('calculators');
  expect(reg.path).toBe(PR4A_ROUTE_BY_REGISTRY_ID[id]);
  expect(reg.initialCalc).toBe(id);
  expect(getToolIcon(id)).toBeTruthy();
}

/**
 * @param {string} id
 * @param {{
 *   getMedicalToolsCatalogRows: () => Array<Record<string, unknown>>,
 *   clinicalIntentToolsById: Record<string, { chatSeed?: string }>,
 * }} ctx
 */
export function assertPr4aCatalogRow(id, { getMedicalToolsCatalogRows, clinicalIntentToolsById }) {
  const rows = getMedicalToolsCatalogRows().filter((r) => r.primaryId === id);
  expect(rows, `catalog row count for ${id}`).toHaveLength(1);
  const row = rows[0];
  expect(row.source).toMatch(/NLU|toolRegistry/);
  expect(row.pagePath).toBe(PR4A_ROUTE_BY_REGISTRY_ID[id]);
  expect(row.chatOnlyForm).toBe(false);
  expect(row.uiCalculatorSlug).toBe(id);
  expect(row.chatOnRequest).toBe(true);
  expect(row.backendExecutor).toBe(false);
  expect(row.chatSeed?.length).toBeGreaterThan(20);
  expect(row.chatSeed).toBe(clinicalIntentToolsById[id]?.chatSeed);
}

/**
 * @param {string} id
 * @param {{ getAllDiscoveredTools: () => Array<Record<string, unknown>> }} ctx
 */
export function assertPr4aDiscoveryCanonical(id, { getAllDiscoveredTools }) {
  const hits = getAllDiscoveredTools().filter((r) => r.id === id);
  expect(hits, `discovery duplicates for ${id}`).toHaveLength(1);
  expect(hits[0].path).toBe(PR4A_ROUTE_BY_REGISTRY_ID[id]);
  const blob = [hits[0].source, ...(hits[0].sources || []), hits[0].notes].filter(Boolean).join(' ');
  expect(blob).toMatch(/toolRegistry|clinicalIntentToolCatalog|tool\.patterns|NLU/i);
}

/**
 * @param {string} alias
 * @param {string} canonical
 * @param {{
 *   NLU_TO_REGISTRY_ID: Record<string, string>,
 *   resolveRegistryId: (id: string) => string | null,
 *   resolveCatalogLaunch: (id: string) => {
 *     path: string|null,
 *     registryId: string|null,
 *     chatSeed: string|null,
 *     openLabel: string,
 *     orchestratorTool: string|null,
 *   },
 *   clinicalIntentToolsById: Record<string, { chatSeed?: string }>,
 * }} ctx
 */
export function assertPr4aAliasResolves(alias, canonical, ctx) {
  const dedicatedPath = PR4A_ROUTE_BY_REGISTRY_ID[canonical];
  expect(ctx.NLU_TO_REGISTRY_ID[alias], `NLU_TO_REGISTRY_ID[${alias}]`).toBe(canonical);
  expect(ctx.resolveRegistryId(alias)).toBe(canonical);

  const fromAlias = ctx.resolveCatalogLaunch(alias);
  const fromCanonical = ctx.resolveCatalogLaunch(canonical);
  expect(fromAlias.path).toBe(dedicatedPath);
  expect(fromAlias.registryId).toBe(canonical);
  expect(fromAlias.path).toBe(fromCanonical.path);
  expect(fromAlias.registryId).toBe(fromCanonical.registryId);
  expect(fromAlias.chatSeed).toBe(fromCanonical.chatSeed);
  expect(fromAlias.chatSeed).toBe(ctx.clinicalIntentToolsById[canonical]?.chatSeed);
  expect(fromAlias.chatSeed?.length).toBeGreaterThan(20);
  expect(fromAlias.openLabel).toBe('Open');
  expect(fromAlias.orchestratorTool).toBeNull();
}

/**
 * @param {string} id
 * @param {{
 *   toolRegistryById: Record<string, unknown>,
 *   clinicalIntentToolsById: Record<string, unknown>,
 *   nluCalculatorHubOnly: Array<{ toolId: string }>,
 *   getMedicalToolsCatalogRows: () => Array<Record<string, unknown>>,
 *   getAllDiscoveredTools: () => Array<Record<string, unknown>>,
 *   builtinUiCalculators: Array<{ id: string }>,
 * }} ctx
 */
export function assertPr4aFullyWired(id, ctx) {
  expect(ctx.toolRegistryById[id], `orphan registry: ${id}`).toBeTruthy();
  expect(ctx.clinicalIntentToolsById[id], `orphan NLU: ${id}`).toBeTruthy();
  expect(
    ctx.nluCalculatorHubOnly.some((h) => h.toolId === id),
    `${id} must not be hub-only (Tier-A dedicated form)`
  ).toBe(false);
  expect(
    ctx.getMedicalToolsCatalogRows().some((r) => r.primaryId === id),
    `orphan catalog: ${id}`
  ).toBe(true);
  expect(
    ctx.getAllDiscoveredTools().some((r) => r.id === id),
    `orphan discovery: ${id}`
  ).toBe(true);
  expect(
    ctx.builtinUiCalculators.some((c) => c.id === id),
    `orphan builtin: ${id}`
  ).toBe(true);
}
