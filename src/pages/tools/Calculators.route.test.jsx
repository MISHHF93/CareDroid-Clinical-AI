/**
 * Calculator deep-link behavior: slug selection, unknown slug, PR4A switch cases.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  PR1_CALCULATOR_REGISTRY_IDS,
  PR2_TIER_A_CALCULATOR_REGISTRY_IDS,
  PR4A_CALCULATOR_REGISTRY_IDS,
  PR5_CALCULATOR_REGISTRY_IDS,
} from '../../data/clinicalCatalogWiring';
import { ROADMAP_FRONTEND_REGISTRY_IDS } from '../../data/frontendRenderingInventory';

const __dirname = dirname(fileURLToPath(import.meta.url));
const calculatorsSource = readFileSync(join(__dirname, 'Calculators.jsx'), 'utf8');
const appSource = readFileSync(join(__dirname, '../../App.jsx'), 'utf8');

const ROADMAP_TIER_A_REGISTRY_IDS = [
  ...PR1_CALCULATOR_REGISTRY_IDS,
  ...PR2_TIER_A_CALCULATOR_REGISTRY_IDS,
  ...PR4A_CALCULATOR_REGISTRY_IDS,
  ...PR5_CALCULATOR_REGISTRY_IDS,
];

describe('Calculators.jsx route wiring', () => {
  it('builds CALCULATORS from calculatorHubManifest', () => {
    expect(calculatorsSource).toContain('buildBuiltinHubCalculatorCards');
    expect(calculatorsSource).toContain('getHubChatAssistedTools');
  });

  it('handles unknown calculator slugs with ToolNotFound', () => {
    expect(calculatorsSource).toContain('unknownSlug');
    expect(calculatorsSource).toContain('<ToolNotFound');
  });

  it.each(PR4A_CALCULATOR_REGISTRY_IDS)('includes switch case for %s', (id) => {
    expect(calculatorsSource).toContain(`case '${id}':`);
  });

  it('imports PR4A calculator components', () => {
    expect(calculatorsSource).toContain('AscvdRiskCalculator');
    expect(calculatorsSource).toContain('CkdStagingCalculator');
    expect(calculatorsSource).toContain('StopBangCalculator');
    expect(calculatorsSource).toContain('AuditCCalculator');
  });

  it.each(ROADMAP_TIER_A_REGISTRY_IDS)('includes switch case for roadmap Tier A %s', (id) => {
    expect(calculatorsSource).toContain(`case '${id}':`);
  });

  it('roadmap inventory count matches PR1–PR6 + fleet scope', () => {
    expect(ROADMAP_FRONTEND_REGISTRY_IDS.length).toBe(25);
  });

  it('keeps calculator hub routes retired from App.jsx', () => {
    expect(appSource).not.toContain("path: '/tools/calculators'");
    expect(appSource).not.toContain("path: '/tools/calculators/:slug'");
    expect(appSource).not.toContain('CALCULATOR_ROUTE_DEFS.map');
    expect(appSource).not.toContain('<LegacyCalculatorRouteRedirect />');
    expect(appSource).toContain(
      '<Route path="/tools/*" element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />} />'
    );
    expect(appSource).not.toContain('initialCalculatorId={calculatorSlug}');
  });

  it('keeps backend-backed lab tools and protocols out of active App.jsx mounts', () => {
    expect(appSource).not.toContain("path: '/tools/lab-interpreter'");
    expect(appSource).not.toContain('<LegacyToolRouteRedirect toolId="lab-interp" />');
    expect(appSource).not.toContain("path: '/tools/calculator-recommender'");
    expect(appSource).not.toContain('<LegacyToolRouteRedirect toolId="calculator-recommender-ai" />');
    expect(appSource).not.toContain("path: '/protocols'");
    expect(appSource).not.toContain('element: <Protocols />');
  });
});
