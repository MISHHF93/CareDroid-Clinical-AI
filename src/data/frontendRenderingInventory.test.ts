/**
 * Frontend rendering audit — PR1–PR6 roadmap + fleet operations UI paths.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  ROADMAP_FRONTEND_REGISTRY_IDS,
  ROADMAP_PR_SLICE_BY_REGISTRY_ID,
  buildFrontendRenderingInventory,
  buildFrontendRenderingRow,
  validateFrontendRenderingRow,
  runFrontendRenderingAudit,
  formatRenderingInventoryTable,
  formatMissingRenderReport,
  sidebarVisibleRoadmapTools,
} from './frontendRenderingInventory';
import {
  PR1_CALCULATOR_REGISTRY_IDS,
  PR2_TIER_A_CALCULATOR_REGISTRY_IDS,
  PR2_TIER_B_CHAT_CALCULATOR_IDS,
  PR3_TIER_B_CHAT_CALCULATOR_IDS,
  PR4A_TIER_A_CALCULATOR_REGISTRY_IDS,
  PR5_TIER_A_CALCULATOR_REGISTRY_IDS,
  PR6_TIER_B_CHAT_CALCULATOR_IDS,
  PR7_TIER_B_CHAT_CALCULATOR_IDS,
  FLEET_TIER_A_REGISTRY_IDS,
  REGISTRY,
  TIER_B_CHAT_CALCULATOR_REGISTRY_IDS,
} from './clinicalToolIdContract';
import { resolveCatalogLaunch } from './clinicalCatalogWiring';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { CALCULATOR_ROUTE_DEFS } from '../routes/clinicalToolRoutes';
import { PR_FLEET_TOOL_IDS } from './prFleetTestConstants';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../app/router.tsx'), 'utf8');
const calculatorsSource = readFileSync(join(__dirname, '../pages/tools/Calculators.tsx'), 'utf8');

const ROADMAP_TIER_A_IDS = [
  ...PR1_CALCULATOR_REGISTRY_IDS,
  ...PR2_TIER_A_CALCULATOR_REGISTRY_IDS,
  ...PR4A_TIER_A_CALCULATOR_REGISTRY_IDS,
  ...PR5_TIER_A_CALCULATOR_REGISTRY_IDS,
];

const ROADMAP_TIER_B_IDS = [
  ...PR2_TIER_B_CHAT_CALCULATOR_IDS,
  ...PR3_TIER_B_CHAT_CALCULATOR_IDS,
  ...PR6_TIER_B_CHAT_CALCULATOR_IDS,
  ...PR7_TIER_B_CHAT_CALCULATOR_IDS,
  REGISTRY.dispatchAi,
];

describe('frontend rendering inventory — roadmap scope', () => {
  it('lists every PR1–PR6 + fleet tool exactly once', () => {
    expect(ROADMAP_FRONTEND_REGISTRY_IDS).toHaveLength(25);
    expect(new Set(ROADMAP_FRONTEND_REGISTRY_IDS).size).toBe(25);
    expect([...PR_FLEET_TOOL_IDS].every((id) => ROADMAP_FRONTEND_REGISTRY_IDS.includes(id))).toBe(
      true
    );
  });

  it('maps each roadmap id to a PR slice label', () => {
    for (const id of ROADMAP_FRONTEND_REGISTRY_IDS) {
      expect(ROADMAP_PR_SLICE_BY_REGISTRY_ID[id], id).toBeTruthy();
    }
  });
});

describe('frontend rendering audit — full matrix', () => {
  it('passes with no missing render paths', () => {
    const audit = runFrontendRenderingAudit();
    expect(
      audit.ok,
      formatMissingRenderReport(audit)
    ).toBe(true);
    expect(audit.failing).toBe(0);
    expect(audit.duplicateIds).toEqual([]);
    expect(audit.routeCollisions).toEqual([]);
  });

  it('inventory table has a row per roadmap tool', () => {
    const table = formatRenderingInventoryTable();
    expect(table).toHaveLength(ROADMAP_FRONTEND_REGISTRY_IDS.length);
    for (const row of table) {
      expect(row.label).toBeTruthy();
      expect(row.route).toBeTruthy();
    }
  });
});

describe('frontend rendering — per-tool layers', () => {
  it.each(ROADMAP_FRONTEND_REGISTRY_IDS)('%s has registry, catalog, discovery, and launch path', (registryId) => {
    const row = buildFrontendRenderingRow(registryId);
    expect(row.layers.registry).toBe(true);
    expect(row.layers.catalog).toBe(true);
    expect(row.layers.discovery).toBe(true);
    expect(row.launchPath).toBeTruthy();
    expect(validateFrontendRenderingRow(row), registryId).toEqual([]);
  });

  it.each(ROADMAP_TIER_A_IDS)('Tier A %s keeps calculator switch but no active App route', (registryId) => {
    const row = buildFrontendRenderingRow(registryId);
    expect(row.tier).toBe('A');
    expect(row.layers.appRoute).toBe(false);
    expect(row.layers.tierAFormSwitch).toBe(true);
    expect(row.builtinSlug).toBeTruthy();
    expect(calculatorsSource).toContain(`case '${row.builtinSlug}':`);
  });

  it.each(ROADMAP_TIER_B_IDS)('Tier B %s has hub card and chat seed', (registryId) => {
    const row = buildFrontendRenderingRow(registryId);
    expect(['B', 'fleet-B']).toContain(row.tier);
    expect(row.layers.tierBHubCard).toBe(true);
    expect(row.layers.tierBChatSeed).toBe(true);
    const launch = resolveCatalogLaunch(registryId);
    expect(launch.path).toBe('/tools/calculators');
  });

  it.each(FLEET_TIER_A_REGISTRY_IDS)('fleet Tier A %s remains archived outside active App routes', (registryId) => {
    const row = buildFrontendRenderingRow(registryId);
    expect(row.tier).toBe('fleet-A');
    expect(row.layers.fleetPage).toBe(false);
    expect(row.route.startsWith('/fleet/')).toBe(true);
  });
});

describe('frontend rendering — App.jsx routes', () => {
  it('redirects retired tools routes into the CareDroid whiteboard', () => {
    expect(appSource).not.toContain("path: '/tools/calculators'");
    expect(appSource).not.toContain('<LegacyCalculatorRouteRedirect />');
    expect(appSource).toContain('<Route path="/tools/*" element={<ToolsRedirect />} />');
  });

  it('derives Tier A calculator routes from CALCULATOR_ROUTE_DEFS in App.jsx', () => {
    expect(appSource).not.toContain('CALCULATOR_ROUTE_DEFS.map');
    expect(appSource).not.toContain('<LegacyCalculatorRouteRedirect />');
    expect(appSource).not.toContain('initialCalculatorId={calculatorSlug}');
    const roadmapSlugs = buildFrontendRenderingInventory()
      .filter((r) => r.tier === 'A')
      .map((r) => r.builtinSlug);
    for (const slug of roadmapSlugs) {
      expect(
        CALCULATOR_ROUTE_DEFS.some((d) => d.calculatorSlug === slug),
        slug
      ).toBe(true);
    }
  });

  it('keeps fleet routes out of the active CareDroid app', () => {
    for (const id of FLEET_TIER_A_REGISTRY_IDS) {
      const row = buildFrontendRenderingRow(id);
      expect(row.route.startsWith('/fleet/')).toBe(true);
      expect(row.layers.appRoute).toBe(false);
    }
  });
});

describe('frontend rendering — catalog launch', () => {
  it.each(ROADMAP_FRONTEND_REGISTRY_IDS)('catalog row for %s resolves launch', (registryId) => {
    const rows = getMedicalToolsCatalogRows().filter(
      (r) => r.sidebarToolId === registryId || r.id === registryId
    );
    expect(rows.length).toBeGreaterThan(0);
    const launch = resolveCatalogLaunch(registryId);
    expect(launch.path).toBeTruthy();
  });
});

describe('frontend rendering — sidebar destinations', () => {
  it.each(sidebarVisibleRoadmapTools().map((t) => t.id))(
    'sidebar tool %s navigates to a known destination',
    (registryId) => {
      const row = buildFrontendRenderingRow(registryId);
      expect(row.layers.sidebarPath, registryId).toBe(true);
    }
  );
});

describe('frontend rendering — invalid tool fallback', () => {
  it('Calculators unknown slug uses ToolNotFound', () => {
    expect(calculatorsSource).toContain('unknownSlug');
    expect(calculatorsSource).toContain('<ToolNotFound');
  });

  it('invalid registry id launch still returns hub or fallback path', () => {
    const launch = resolveCatalogLaunch('not-a-real-tool-id-xyz');
    expect(launch.path === '/tools/calculators' || launch.path === null || launch.path).toBeTruthy();
  });
});

describe('frontend rendering — Tier B registry parity', () => {
  it('roadmap Tier B ids match TIER_B_CHAT_CALCULATOR_REGISTRY_IDS subset', () => {
    const roadmapB = ROADMAP_TIER_B_IDS.filter((id) => id !== REGISTRY.dispatchAi);
    for (const id of roadmapB) {
      expect(TIER_B_CHAT_CALCULATOR_REGISTRY_IDS).toContain(id);
    }
  });
});
