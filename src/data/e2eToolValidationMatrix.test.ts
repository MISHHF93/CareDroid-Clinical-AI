/**
 * E2E validation matrix — deterministic wiring tests for all shipped tools.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import toolRegistry from './toolRegistry';
import {
  ALL_REGISTRY_TOOL_IDS,
  NLU_PROFILE_TOOL_IDS,
  ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
  REGISTRY_ID_TO_ORCHESTRATOR_TOOL,
  NLU_TO_REGISTRY_ID,
} from './clinicalToolIdContract';
import { clinicalIntentTools } from './clinicalIntentToolCatalog';
import { resolveCatalogLaunch, resolveRegistryId } from './clinicalCatalogWiring';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import {
  buildE2eToolInventory,
  buildMatrixRowForRegistry,
  formatE2eMatrixMarkdown,
  getE2eValidationMatrixDocument,
  runMatrixValidation,
  tierForRegistryId,
  TEST_COVERAGE_BY_REGISTRY_ID,
  assertLaunchPathMatchesRoute,
  assertNluResolvesToRegistry,
  KNOWN_TOOL_AREA_PATHS,
  matchCalculatorRoute,
} from './e2eToolValidationMatrix';
import {
  CALCULATOR_ROUTE_DEFS,
  isKnownToolAreaPath,
} from '../routes/clinicalToolRoutes';
import { flattenManualQaChecklist } from './e2eManualQaChecklist';
import { flattenRegressionChecklist } from './e2eRegressionChecklist';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../app/router.jsx'), 'utf8');

function parseBackendExecutorIds() {
  const src = readFileSync(
    join(
      __dirname,
      '../../backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.registry.ts'
    ),
    'utf8'
  );
  const block = src.match(/REGISTERED_EXECUTOR_TOOL_IDS\s*=\s*\[([\s\S]*?)\]\s*as const/);
  if (!block) return [];
  return [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
}

describe('e2e validation matrix document', () => {
  it('builds complete inventory for every registry tool id', () => {
    const doc = getE2eValidationMatrixDocument();
    const registryIds = doc.inventory.filter((r) => r.kind === 'registry').map((r) => r.id);
    expect(registryIds.sort()).toEqual([...ALL_REGISTRY_TOOL_IDS].sort());
    expect(doc.summary.registryTools).toBe(ALL_REGISTRY_TOOL_IDS.length);
  });

  it('matrix validation passes with no wiring issues', () => {
    const result = runMatrixValidation();
    expect(result.ok, JSON.stringify(result.findings.filter((f) => f.issues.length), null, 2)).toBe(
      true
    );
  });

  it('documents NLU profile count aligned with clinicalIntentTools', () => {
    const doc = getE2eValidationMatrixDocument();
    expect(doc.nluProfileCount).toBe(clinicalIntentTools.length);
    expect(NLU_PROFILE_TOOL_IDS.length).toBe(clinicalIntentTools.length);
  });
});

describe('e2e matrix — per-registry row facts', () => {
  it.each(ALL_REGISTRY_TOOL_IDS)('%s has tier, route, and test coverage entries', (registryId) => {
    const row = buildMatrixRowForRegistry(registryId);
    expect(row.id).toBe(registryId);
    expect(row.tier).toBe(tierForRegistryId(registryId));
    expect(row.route).toBeTruthy();
    expect(row.registryPresence).toBe(true);
    expect(row.testCoverage.length).toBeGreaterThan(0);
    expect(row.testCoverage).toContain('e2eToolValidationMatrix.test.js');
  });

  it.each(Object.keys(REGISTRY_ID_TO_ORCHESTRATOR_TOOL))(
    'Tier C %s has POST executor and orchestrator NLU id',
    (registryId) => {
      const row = buildMatrixRowForRegistry(registryId);
      expect(row.tier).toBe('C');
      expect(row.accessModes).toContain('tier-c-executor');
      expect(row.backendPostExecutor).toBe(true);
      expect(ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS).toContain(row.orchestratorToolId);
    }
  );

  it('sofa-score is Tier C executor and retains Tier A form access', () => {
    const row = buildMatrixRowForRegistry('sofa-score');
    expect(row.tier).toBe('C');
    expect(row.accessModes).toContain('tier-a-form');
    expect(row.accessModes).toContain('tier-c-executor');
    expect(row.route).toBe('/tools/calculators/sofa');
  });
});

describe('e2e matrix — route validity', () => {
  it('every registry path is a known tool-area path', () => {
    for (const reg of toolRegistry) {
      if (reg.path) {
        expect(isKnownToolAreaPath(reg.path), reg.id).toBe(true);
      }
    }
  });

  it('calculator routes are indexed by CALCULATOR_ROUTE_DEFS and redirected by App.jsx', () => {
    expect(appSource).not.toContain('CALCULATOR_ROUTE_DEFS.map');
    expect(appSource).not.toContain('<LegacyCalculatorRouteRedirect />');
    expect(appSource).toContain('<Route path="/tools/*" element={<ToolsRedirect />} />');
    expect(appSource).not.toContain('initialCalculatorId={calculatorSlug}');
    for (const def of CALCULATOR_ROUTE_DEFS) {
      expect(matchCalculatorRoute(def.path)?.calculatorSlug).toBe(def.calculatorSlug);
    }
  });

  it('KNOWN_TOOL_AREA_PATHS includes catalog and overview', () => {
    expect(KNOWN_TOOL_AREA_PATHS).toContain('/tools/catalog');
    expect(KNOWN_TOOL_AREA_PATHS).toContain('/tools');
  });
});

describe('e2e matrix — catalog discovery', () => {
  it('catalog rows cover every registry id except hub-only duplicates', () => {
    const catalogRegistryIds = new Set(
      getMedicalToolsCatalogRows().map((r) => r.sidebarToolId || r.id)
    );
    for (const id of ALL_REGISTRY_TOOL_IDS) {
      expect(catalogRegistryIds.has(id), `catalog missing ${id}`).toBe(true);
    }
  });

  it('every Tier A/B registry row reports catalog presence in matrix', () => {
    const inventory = buildE2eToolInventory();
    const tierAB = inventory.filter(
      (r) => r.kind === 'registry' && ['A', 'B', 'fleet-B'].includes(r.tier)
    );
    for (const row of tierAB) {
      expect(row.catalogPresence, row.id).toBe(true);
    }
  });
});

describe('e2e matrix — NLU resolution', () => {
  it.each(NLU_PROFILE_TOOL_IDS)('NLU profile %s resolves to a registry id', (nluId) => {
    const registryId = resolveRegistryId(nluId);
    expect(registryId).toBeTruthy();
    expect(ALL_REGISTRY_TOOL_IDS.includes(registryId) || registryId === 'calculators').toBe(true);
  });

  it('canonical NLU ids map through ORCHESTRATOR_TO_REGISTRY_ID', () => {
    expect(assertNluResolvesToRegistry('sofa-calculator', 'sofa-score')).toBe(true);
    expect(assertNluResolvesToRegistry('drug-interactions', 'drug-check')).toBe(true);
    expect(assertNluResolvesToRegistry('phq9', 'phq9')).toBe(true);
  });

  it('NLU_TO_REGISTRY_ID targets are valid registry ids', () => {
    const registrySet = new Set(ALL_REGISTRY_TOOL_IDS);
    for (const target of Object.values(NLU_TO_REGISTRY_ID)) {
      expect(registrySet.has(target), target).toBe(true);
    }
  });
});

describe('e2e matrix — launch behavior', () => {
  it.each(ALL_REGISTRY_TOOL_IDS)('resolveCatalogLaunch(%s) matches expectedLaunchPath', (registryId) => {
    expect(assertLaunchPathMatchesRoute(registryId)).toBe(true);
  });

  it('dispatch-ai launch has no orchestrator executor', () => {
    const launch = resolveCatalogLaunch('dispatch-ai');
    expect(launch.orchestratorTool).toBeNull();
    expect(launch.path).toBe('/tools/calculators');
    expect(launch.chatSeed?.length).toBeGreaterThan(50);
  });

  it.each(['drug-check', 'lab-interp', 'sofa-score'])(
    'Tier C %s launch includes orchestrator tool',
    (registryId) => {
      const launch = resolveCatalogLaunch(registryId);
      expect(launch.orchestratorTool).toBe(REGISTRY_ID_TO_ORCHESTRATOR_TOOL[registryId]);
    }
  );
});

describe('e2e matrix — backend executor mappings', () => {
  it('frontend orchestrator ids match backend REGISTERED_EXECUTOR_TOOL_IDS', () => {
    const backend = parseBackendExecutorIds();
    expect([...ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS].sort()).toEqual(backend);
  });

  it('only three registry ids map to POST executors', () => {
    const postRegistry = buildE2eToolInventory()
      .filter((r) => r.backendPostExecutor)
      .map((r) => r.id);
    expect(postRegistry.sort()).toEqual(Object.keys(REGISTRY_ID_TO_ORCHESTRATOR_TOOL).sort());
  });

  it('dispatch-ai is NLU/chat-routed only with no POST executor', () => {
    const row = buildE2eToolInventory().find((r) => r.id === 'dispatch-ai');
    expect(row?.backendNluExecutable).toBe(true);
    expect(row?.backendPostExecutor).toBe(false);
  });
});

describe('e2e matrix — test coverage map', () => {
  it('every registry id has at least one dedicated wiring test or matrix base', () => {
    for (const id of ALL_REGISTRY_TOOL_IDS) {
      const coverage = TEST_COVERAGE_BY_REGISTRY_ID[id] || [];
      const row = buildMatrixRowForRegistry(id);
      expect(row.testCoverage.length).toBeGreaterThan(2);
      if (coverage.length) {
        expect(row.testCoverage).toEqual(expect.arrayContaining([...coverage]));
      }
    }
  });
});

describe('e2e QA artifacts', () => {
  it('manual QA checklist has sections and items', () => {
    const flat = flattenManualQaChecklist();
    expect(flat.length).toBeGreaterThan(10);
    expect(flat.every((i) => i.steps && i.expected)).toBe(true);
  });

  it('regression checklist has automated and manual groups', () => {
    const flat = flattenRegressionChecklist();
    expect(flat.some((c) => c.groupId === 'automated-gates')).toBe(true);
    expect(flat.some((c) => c.check.includes('e2eToolValidationMatrix'))).toBe(true);
  });
});

describe('e2e matrix — inventory columns', () => {
  it('every inventory row documents required wiring columns', () => {
    const inventory = buildE2eToolInventory();
    for (const row of inventory) {
      expect(row).toHaveProperty('tier');
      expect(row).toHaveProperty('route');
      expect(row).toHaveProperty('registryPresence');
      expect(row).toHaveProperty('catalogPresence');
      expect(row).toHaveProperty('discoveryPresence');
      expect(row).toHaveProperty('nluPresence');
      expect(row).toHaveProperty('backendPostExecutor');
      expect(row.launch).toHaveProperty('path');
      expect(Array.isArray(row.testCoverage)).toBe(true);
    }
  });

  it('markdown export includes all registry ids', () => {
    const md = formatE2eMatrixMarkdown();
    for (const id of ALL_REGISTRY_TOOL_IDS) {
      expect(md).toContain(`| ${id} |`);
    }
  });
});
