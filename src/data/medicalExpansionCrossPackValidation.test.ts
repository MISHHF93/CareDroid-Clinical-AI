import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { BUILTIN_CALCULATOR_FORM_SMOKE_ROWS } from './calculatorHubManifest';
import { resolveCatalogLaunch } from './clinicalCatalogWiring';
import { builtinUiCalculators } from './clinicalIntentToolCatalog';
import {
  MEDICAL_EXPANSION_CATEGORY_PACKS,
  ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
  REGISTRY_ID_TO_ORCHESTRATOR_TOOL,
} from './clinicalToolIdContract';
import {
  getMedicalExpansionCategoryPackRows,
  getMedicalToolsCatalogRows,
} from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools } from './sourceCodeToolDiscovery';
import {
  getCanonicalToolInventory,
  getUserFacingToolInventory,
  resolveToolInventoryRecord,
  TOOL_EXECUTOR_STATUS,
  TOOL_LAUNCH_TYPES,
  TOOL_SURFACES,
} from './toolInventory';
import { toolRegistryById } from './toolRegistry';
import { getRegistryToolNavigation } from '../navigation/registryToolLaunch';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { CALCULATOR_ROUTE_DEFS, KNOWN_TOOL_AREA_PATHS } from '../routes/clinicalToolRoutes';
import {
  MOBILE_FIRST_VIEWPORT_WIDTHS,
  RESPONSIVE_QA_PAGES,
  TIER_A_CALCULATOR_PATH_BY_REGISTRY_ID,
} from './responsiveQaMatrix';
import { buildToolContractMatrixRows } from './toolContractMatrix';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../..');
const backendPatternsSource = readFileSync(
  join(
    repoRoot,
    'backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts',
  ),
  'utf8',
);
const providersSource = readFileSync(join(repoRoot, 'src/app/providers.tsx'), 'utf8');
const themeContextSource = readFileSync(join(repoRoot, 'src/contexts/ThemeContext.tsx'), 'utf8');
const themeTestSource = readFileSync(join(repoRoot, 'src/contexts/ThemeContext.test.tsx'), 'utf8');

const allPackIds = [
  ...new Set(
    MEDICAL_EXPANSION_CATEGORY_PACKS.flatMap((pack) => [
      ...pack.tierA,
      ...pack.tierB,
      ...pack.tierC,
    ]),
  ),
];

const sharedRouteAllowlist = new Set([
  '/tools/calculators',
  '/hospital-map',
  '/medical-iot',
  '/devices',
]);
const documentedPlaceholderIds = new Set(['moca-placeholder-workflow']);

function expectNonBlank(value, label) {
  expect(String(value || '').trim(), label).not.toBe('');
}

describe('medical expansion cross-pack validation', () => {
  it('defines category pack rows for packs 2-10 and every tool has a canonical id', () => {
    expect(MEDICAL_EXPANSION_CATEGORY_PACKS).toHaveLength(9);
    expect(getMedicalExpansionCategoryPackRows()).toHaveLength(9);

    const canonicalIds = new Set(getCanonicalToolInventory().map((record) => record.id));
    for (const id of allPackIds) {
      expect(canonicalIds.has(id), `missing canonical inventory id: ${id}`).toBe(true);
      expect(resolveToolInventoryRecord(id), `unresolvable canonical id: ${id}`).toBeTruthy();
      expect(toolRegistryById[id], `missing toolRegistry row: ${id}`).toBeTruthy();
    }
  });

  it('keeps every user-facing pack tool discoverable in /tools and source discovery', () => {
    const userFacingIds = new Set(getUserFacingToolInventory().map((record) => record.id));
    const catalogIds = new Set(
      getMedicalToolsCatalogRows().flatMap((row) =>
        [row.id, row.primaryId, row.sidebarToolId].filter(Boolean),
      ),
    );
    const discoveredIds = new Set(
      getAllDiscoveredTools().flatMap((row) => [row.id, row.mapsTo].filter(Boolean)),
    );

    for (const id of allPackIds) {
      expect(userFacingIds.has(id), `not user-facing in /tools inventory: ${id}`).toBe(true);
      expect(catalogIds.has(id), `missing /tools catalog row: ${id}`).toBe(true);
      expect(discoveredIds.has(id), `missing source discovery row: ${id}`).toBe(true);
    }
  });

  it('launches every Tier A calculator through /tools/calculators with UI or documented placeholder', () => {
    const builtinSlugs = new Set(builtinUiCalculators.map((calc) => calc.id));
    const smokeSlugs = new Set(BUILTIN_CALCULATOR_FORM_SMOKE_ROWS.map((row) => row.slug));
    const routeSlugs = new Set(CALCULATOR_ROUTE_DEFS.map((route) => route.calculatorSlug));

    for (const pack of MEDICAL_EXPANSION_CATEGORY_PACKS) {
      for (const id of pack.tierA) {
        const record = resolveToolInventoryRecord(id);
        const launch = resolveCatalogLaunch(id);
        const slug = record?.calculatorSlug;

        // Tools with a real backend executor (see REGISTRY_ID_TO_ORCHESTRATOR_TOOL) resolve
        // launchType 'backend-backed' instead of the old 'local-only' — they're still
        // launched through the same builtin calculator UI/route, just backend-executed.
        expect(record?.launchType, id).toBe(
          REGISTRY_ID_TO_ORCHESTRATOR_TOOL[id]
            ? TOOL_LAUNCH_TYPES.BACKEND_BACKED
            : TOOL_LAUNCH_TYPES.LOCAL_ONLY,
        );
        expect(launch.path, id).toMatch(/^\/tools\/calculators\//);
        expect(TIER_A_CALCULATOR_PATH_BY_REGISTRY_ID[id], id).toBe(launch.path);
        expect(builtinSlugs.has(slug), id).toBe(true);
        expect(smokeSlugs.has(slug), id).toBe(true);
        expect(routeSlugs.has(slug), id).toBe(true);

        if (documentedPlaceholderIds.has(id)) {
          const copy = `${record?.safetyCopy || ''} ${launch.chatSeed || ''}`;
          expect(copy, id).toMatch(/placeholder|does not calculate|not official/i);
        }
      }
    }
  });

  it('gives every Tier B tool guarded chatSeed and launch metadata', () => {
    for (const pack of MEDICAL_EXPANSION_CATEGORY_PACKS) {
      for (const id of pack.tierB) {
        const record = resolveToolInventoryRecord(id);
        const launch = resolveCatalogLaunch(id);
        const nav = getRegistryToolNavigation(id);

        expect(record?.launchType, id).toBe(TOOL_LAUNCH_TYPES.CHAT_ASSISTED);
        expect(launch.registryId, id).toBe(id);
        expectNonBlank(launch.chatSeed, `${id} chatSeed`);
        expect(nav.mode, id).toBe('chat-assisted');
        expect(nav.pathname, id).toBe(CANONICAL_ROUTES.emergencyCopilot);
        expect(launch.orchestratorTool, id).toBeNull();
        expect(launch.chatSeed, id).toMatch(
          /decision support|do not|does not|human review|human approval|must not delay/i,
        );
        expect(backendPatternsSource, id).toContain(`toolId: '${record?.nluToolId || id}'`);
      }
    }
  });

  it('gives every Tier C dashboard/engine a contract, component, or documented demo state', () => {
    const matrixById = new Map(buildToolContractMatrixRows().map((row) => [row.id, row]));

    for (const pack of MEDICAL_EXPANSION_CATEGORY_PACKS) {
      for (const id of pack.tierC) {
        const record = resolveToolInventoryRecord(id);
        const launch = resolveCatalogLaunch(id);
        const matrix = matrixById.get(id);
        const safetyCopy = `${record?.safetyCopy || ''} ${launch.chatSeed || ''} ${record?.notes || ''}`;

        expect(record, id).toBeTruthy();
        expect(record?.component, id).toBeTruthy();
        expect(record?.route, id).toBeTruthy();
        expect(KNOWN_TOOL_AREA_PATHS, id).toContain(record.route);
        expect(matrix, id).toBeTruthy();
        expect(record?.executorStatus, id).not.toBe(TOOL_EXECUTOR_STATUS.REGISTERED);
        expect(safetyCopy, id).toMatch(
          /decision support|monitoring|dashboard|demo|human|no autonomous|does not/i,
        );
      }
    }
  });

  it('has no duplicate ids, accidental duplicate routes, or orphan launch paths', () => {
    const inventory = getCanonicalToolInventory();
    expect(new Set(inventory.map((record) => record.id)).size).toBe(inventory.length);
    expect(new Set(Object.keys(toolRegistryById)).size).toBe(Object.keys(toolRegistryById).length);

    const routeBuckets = new Map();
    for (const id of allPackIds) {
      const record = resolveToolInventoryRecord(id);
      const route = record?.route;
      expect(route, id).toBeTruthy();
      expect(KNOWN_TOOL_AREA_PATHS, id).toContain(route);
      routeBuckets.set(route, [...(routeBuckets.get(route) || []), id]);
    }

    for (const [route, ids] of routeBuckets) {
      if (ids.length <= 1) continue;
      expect(sharedRouteAllowlist.has(route), `${route}: ${ids.join(', ')}`).toBe(true);
    }
  });

  it('does not falsely advertise backend executors', () => {
    const registeredExecutors = new Set(ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS);
    for (const id of allPackIds) {
      const record = resolveToolInventoryRecord(id);
      const launch = resolveCatalogLaunch(id);
      const advertisedExecutor = REGISTRY_ID_TO_ORCHESTRATOR_TOOL[id];

      if (advertisedExecutor) {
        expect(registeredExecutors.has(advertisedExecutor), id).toBe(true);
      } else {
        expect(record?.orchestratorToolId, id).toBeFalsy();
        expect(launch.orchestratorTool, id).toBeNull();
        expect(record?.executorStatus, id).not.toBe(TOOL_EXECUTOR_STATUS.REGISTERED);
      }
    }
  });

  it('has non-blank launchable UI metadata for every pack tool', () => {
    for (const id of allPackIds) {
      const record = resolveToolInventoryRecord(id);
      const registry = toolRegistryById[id];
      const launch = resolveCatalogLaunch(id);

      expectNonBlank(record?.label, `${id} label`);
      expectNonBlank(registry?.name, `${id} registry name`);
      expectNonBlank(registry?.description, `${id} registry description`);
      expectNonBlank(launch.path || launch.chatSeed, `${id} launch`);
      expect(record?.surface, id).not.toBe(TOOL_SURFACES.INTERNAL);
      expect(record?.launchType, id).not.toBe(TOOL_LAUNCH_TYPES.UNSUPPORTED_PLANNED);
    }
  });

  it('covers all pack routes in mobile widths and standard light theme wiring', () => {
    const responsiveRegistryIds = new Set(
      RESPONSIVE_QA_PAGES.map((page) => page.registryId).filter(Boolean),
    );
    for (const id of allPackIds) {
      expect(responsiveRegistryIds.has(id as any), `missing responsive QA route for ${id}`).toBe(
        true,
      );
    }

    expect(MOBILE_FIRST_VIEWPORT_WIDTHS).toEqual(
      expect.arrayContaining([320, 360, 375, 390, 412, 430, 480, 600, 768, 1024]),
    );
    expect(providersSource).toContain('<ThemeProvider>');
    expect(themeContextSource).toMatch(/standardTheme|STANDARD_THEME/);
    expect(themeTestSource).toMatch(/light/);
  });

  it('surfaces safety disclaimers for clinical, operational, and demo workflows', () => {
    for (const id of allPackIds) {
      const record = resolveToolInventoryRecord(id);
      const launch = resolveCatalogLaunch(id);
      const registry = toolRegistryById[id];
      const copy = `${record?.safetyCopy || ''} ${launch.chatSeed || ''} ${registry?.features?.join(' ') || ''}`;

      expect(copy, id).toMatch(
        /decision support|do not|does not|human|demo|placeholder|must not delay|not a substitute/i,
      );
    }
  });
});
