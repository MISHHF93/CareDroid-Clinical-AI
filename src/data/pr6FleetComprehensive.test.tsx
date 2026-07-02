/**
 * PR6 comprehensive fleet operations coverage (PR-FLEET tools).
 * Fleet dashboard UI, scoring, route optimization, dispatch launch, registry,
 * catalog, discovery, and route validation. Deterministic; no snapshots.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FleetDashboard from '../pages/fleet/FleetDashboard';
import {
  hasMinimumScoringInput,
  normalizePredictiveMaintenanceInput,
  resolveRiskBand,
  scorePredictiveMaintenance,
} from '../services/predictiveMaintenanceScoring';
import {
  hasMinimumRouteInput,
  normalizeRouteOptimizationInput,
  optimizeRoute,
} from '../services/routeOptimizationService';
import toolRegistry, { toolRegistryById } from './toolRegistry';
import {
  clinicalIntentToolsById,
  nluCalculatorHubOnly,
  ORCHESTRATOR_TO_REGISTRY_ID,
} from './clinicalIntentToolCatalog';
import {
  resolveCatalogLaunch,
  resolveNavigationPathForLaunch,
  resolveRegistryId,
  NLU_TO_REGISTRY_ID,
  REGISTRY_ID_TO_ORCHESTRATOR_TOOL,
} from './clinicalCatalogWiring';
import { CHAT_ASSISTED_HUB_GROUPS } from './chatAssistedHubGroups';
import {
  expectedLaunchPath,
  isFleetAreaPath,
  isKnownToolAreaPath,
  REGISTRY_TOOL_PATHS,
} from '../routes/clinicalToolRoutes';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools, toolIdAliases } from './sourceCodeToolDiscovery';
import { fleetChatAssistedLaunchAriaLabel } from './chatAssistedHubGroups';
import { dispatchAiChatConfig } from './chatAssistedFleet/dispatchAi';
import {
  PR_FLEET_ALL_ALIAS_PAIRS,
  PR_FLEET_DISCOVERY_ALIAS_PAIRS,
  PR_FLEET_HUB_PATH,
  PR_FLEET_REQUIRED_NLU_ALIAS_PAIRS,
  PR_FLEET_TIER_A_IDS,
  PR_FLEET_TIER_B_IDS,
  PR_FLEET_TOOL_IDS,
  PR_FLEET_TOOL_SPECS,
  catalogRowsMatchingQuery,
} from './prFleetTestConstants';
import {
  FLEET_DISPATCH_LAUNCH_PHRASES,
  FLEET_PM_HIGH_RISK_INPUT,
  FLEET_PM_MINIMAL_INPUT,
  FLEET_PM_MODERATE_INPUT,
  FLEET_REGISTRY_NLU_PHRASES,
  FLEET_RISK_BAND_BOUNDARIES,
  FLEET_ROUTE_DISTANCE_TIE_INPUT,
  FLEET_ROUTE_LATE_WINDOW_INPUT,
  FLEET_ROUTE_PRIORITY_INPUT,
  FLEET_TIER_A_ROUTE_PATHS,
  buildFleetDashboardSnapshot,
} from './testHelpers/fleetToolsTestFixtures';
import {
  extractToolPatternKeywords,
  messageMatchesToolKeywords,
  messageTriggersBackendDisambiguation,
} from './testHelpers/clinicalToolsTestFixtures';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../app/router.tsx'), 'utf8');
const patternsSource = readFileSync(
  join(
    __dirname,
    '../../backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts'
  ),
  'utf8'
);
const calculatorsSource = readFileSync(join(__dirname, '../pages/tools/Calculators.tsx'), 'utf8');

const BACKEND_KEYWORDS_BY_TOOL = Object.freeze(
  Object.fromEntries(PR_FLEET_TOOL_IDS.map((id) => [id, extractToolPatternKeywords(patternsSource, id)]))
);

const mockFetchFleetCommandSnapshot = vi.fn();

vi.mock('../services/fleetTelemetryService', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchFleetCommandSnapshot: (...args) => mockFetchFleetCommandSnapshot(...args),
  };
});

vi.mock('../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => ({
    recordToolAccess: vi.fn(),
    favorites: [],
    pinned: [],
    recentTools: [],
    toggleFavorite: vi.fn(),
    togglePinned: vi.fn(),
  }),
}));

function renderFleetDashboard() {
  return render(
    <MemoryRouter>
      <FleetDashboard />
    </MemoryRouter>
  );
}

describe('1. Fleet dashboard rendering', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchFleetCommandSnapshot.mockReset();
    mockFetchFleetCommandSnapshot.mockResolvedValue(buildFleetDashboardSnapshot());
  });

  it('renders chrome, skip link, and fleet summary after load', async () => {
    renderFleetDashboard();

    expect(screen.getByRole('link', { name: /Skip to main content/i })).toHaveAttribute(
      'href',
      '#fleet-dashboard-main'
    );
    expect(
      screen.getByRole('heading', { level: 1, name: /Fleet Command Dashboard/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Loading fleet telemetry/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Fleet summary/i })).toBeInTheDocument();
    });

    const summaryGroup = screen.getByRole('group', { name: /Fleet summary metrics/i });
    expect(within(summaryGroup).getByText('Active')).toBeInTheDocument();
    expect(within(summaryGroup).getByText('Avg utilization')).toBeInTheDocument();

    const vehicleRoster = screen.getByRole('heading', { name: /Vehicle roster/i }).closest('section');
    expect(vehicleRoster).not.toBeNull();
    expect(within(vehicleRoster as HTMLElement).getByText('Test Van')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Dispatch intelligence review/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Human dispatchers must approve/i).length).toBeGreaterThanOrEqual(1);
  });

  it('shows operational alert when maintenance or low-energy counts are elevated', async () => {
    mockFetchFleetCommandSnapshot.mockResolvedValue(
      buildFleetDashboardSnapshot({
        summary: {
          maintenanceCount: 2,
          lowEnergyCount: 1,
        },
        vehicles: [
          {
            id: 'VH-LOW',
            label: 'Low Energy Van',
            status: 'occupied',
            maintenanceStatus: 'warning',
            etaMinutes: 12,
            energyType: 'electric',
            energyPercent: 22,
            utilizationPercent: 90,
            driver: 'Test Driver',
          },
        ],
      })
    );

    renderFleetDashboard();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Operational attention/i);
    });
    expect(screen.getByText(/Low-energy units/i)).toBeInTheDocument();
  });

  it('shows empty state when no vehicles report', async () => {
    mockFetchFleetCommandSnapshot.mockResolvedValue(
      buildFleetDashboardSnapshot({ vehicles: [], summary: { totalVehicles: 0 } })
    );
    renderFleetDashboard();
    await waitFor(() => {
      expect(screen.getByText(/No vehicles are reporting telemetry/i)).toBeInTheDocument();
    });
  });

  it('shows error state with retry when telemetry fetch fails', async () => {
    mockFetchFleetCommandSnapshot.mockRejectedValue(new Error('Telemetry offline'));
    renderFleetDashboard();
    await waitFor(() => {
      const errorPanel = document.querySelector('.fleet-dashboard-error');
      expect(errorPanel).toBeTruthy();
      expect(errorPanel).toHaveTextContent(/Telemetry offline/i);
    });
    expect(
      screen.getByRole('button', { name: /Retry loading fleet telemetry/i })
    ).toBeInTheDocument();
  });

  it('renders maintenance breakdown and per-vehicle energy meters', async () => {
    const base = buildFleetDashboardSnapshot();
    mockFetchFleetCommandSnapshot.mockResolvedValue(
      buildFleetDashboardSnapshot({
        vehicles: [
          ...base.vehicles,
          {
            id: 'VH-FUEL',
            label: 'Fuel Truck',
            status: 'maintenance',
            maintenanceStatus: 'warning',
            etaMinutes: 5,
            energyType: 'fuel',
            energyPercent: 50,
            utilizationPercent: 20,
            driver: 'Driver A',
          },
        ],
      })
    );

    renderFleetDashboard();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Maintenance status/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('meter', { name: /Battery level for Test Van/i })).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: /Fuel level for Fuel Truck/i })).toBeInTheDocument();
  });
});

describe('2. Predictive maintenance scoring', () => {
  it.each(FLEET_RISK_BAND_BOUNDARIES)(
    'resolveRiskBand($score) → $band',
    ({ score, band }) => {
      expect(resolveRiskBand(score)).toBe(band);
    }
  );

  it('requires at least one substantive field before scoring', () => {
    const normalized = normalizePredictiveMaintenanceInput({});
    expect(hasMinimumScoringInput(normalized)).toBe(false);
    const result = scorePredictiveMaintenance({});
    expect(result.riskBand).toBe('low');
    expect(result.maintenanceRiskScore).toBe(0);
  });

  it('scores minimal healthy profile in low band', () => {
    const result = scorePredictiveMaintenance(FLEET_PM_MINIMAL_INPUT);
    expect(result.maintenanceRiskScore).toBeLessThan(50);
    expect(result.riskBand).toBe('low');
    expect(result.suggestedInspectionWindows.length).toBeGreaterThanOrEqual(3);
  });

  it('scores high-risk profile in critical band with anomalies', () => {
    const result = scorePredictiveMaintenance(FLEET_PM_HIGH_RISK_INPUT);
    expect(result.maintenanceRiskScore).toBeGreaterThanOrEqual(75);
    expect(result.riskBand).toBe('critical');
    expect(result.anomalyIndicators.length).toBeGreaterThan(0);
    expect(result.suggestedInspectionWindows[0].label).toBe('Immediate');
  });

  it('is deterministic for identical inputs', () => {
    const a = scorePredictiveMaintenance(FLEET_PM_HIGH_RISK_INPUT);
    const b = scorePredictiveMaintenance(FLEET_PM_HIGH_RISK_INPUT);
    expect(a.maintenanceRiskScore).toBe(b.maintenanceRiskScore);
    expect(a.riskBand).toBe(b.riskBand);
    expect(a.anomalyIndicators.map((x) => x.id)).toEqual(b.anomalyIndicators.map((x) => x.id));
  });

  it('scores moderate profile in moderate or high band', () => {
    const result = scorePredictiveMaintenance(FLEET_PM_MODERATE_INPUT);
    expect(result.maintenanceRiskScore).toBeGreaterThanOrEqual(25);
    expect(result.maintenanceRiskScore).toBeLessThan(75);
    expect(['moderate', 'high']).toContain(result.riskBand);
    expect(result.contributingFactors.length).toBeGreaterThan(0);
  });

  it('normalizes negative numeric fields without treating them as substantive input', () => {
    const normalized = normalizePredictiveMaintenanceInput({
      vehicleAgeYears: -1,
      mileage: -100,
    });
    expect(normalized.vehicleAgeYears).toBeNull();
    expect(normalized.mileage).toBeNull();
    expect(hasMinimumScoringInput(normalized)).toBe(false);
  });
});

describe('3. Route optimization behavior', () => {
  it('rejects empty destination labels', () => {
    const normalized = normalizeRouteOptimizationInput({
      destinations: [{ label: '' }, { label: '  ' }],
    });
    expect(hasMinimumRouteInput(normalized)).toBe(false);
    const result = optimizeRoute({ destinations: [{ label: '' }] });
    expect(result.optimizedSequence).toHaveLength(0);
  });

  it('orders by priority then window', () => {
    const result = optimizeRoute(FLEET_ROUTE_PRIORITY_INPUT);
    const labels = result.optimizedSequence.map((s) => s.destination.label);
    expect(labels).toEqual(['Clinic A', 'Clinic B', 'Clinic D', 'Clinic C']);
  });

  it('prefers nearer distance within same priority', () => {
    const result = optimizeRoute(FLEET_ROUTE_DISTANCE_TIE_INPUT);
    expect(result.optimizedSequence[0].destination.label).toBe('Near');
  });

  it('applies heavier traffic to travel minutes', () => {
    const low = optimizeRoute({
      destinations: [{ label: 'Stop 1', distanceKm: 40 }],
      trafficConstraints: { level: 'low' },
    });
    const heavy = optimizeRoute({
      destinations: [{ label: 'Stop 1', distanceKm: 40 }],
      trafficConstraints: { level: 'heavy' },
    });
    expect(heavy.optimizedSequence[0].travelMinutes).toBeGreaterThan(
      low.optimizedSequence[0].travelMinutes
    );
  });

  it('is deterministic for identical route input', () => {
    const a = optimizeRoute(FLEET_ROUTE_PRIORITY_INPUT);
    const b = optimizeRoute(FLEET_ROUTE_PRIORITY_INPUT);
    expect(a.optimizedSequence.map((l) => l.destination.id)).toEqual(
      b.optimizedSequence.map((l) => l.destination.id)
    );
    expect(a.routeSavings.minutesSaved).toBe(b.routeSavings.minutesSaved);
  });

  it('flags late delivery window on optimized sequence leg', () => {
    const result = optimizeRoute(FLEET_ROUTE_LATE_WINDOW_INPUT);
    expect(result.optimizedSequence).toHaveLength(1);
    expect(result.optimizedSequence[0].windowStatus).toBe('late');
  });

  it('warns when planned stops exceed vehicle maxStops', () => {
    const result = optimizeRoute({
      destinations: [
        { label: 'Stop A', priority: 'urgent' },
        { label: 'Stop B', priority: 'high' },
        { label: 'Stop C', priority: 'medium' },
      ],
      vehicleLimitations: { maxStops: 2 },
    });
    expect(result.warnings.some((w) => /max stop/i.test(w))).toBe(true);
  });
});

describe('4. Dispatch launch behavior', () => {
  it('resolves hub launch with orchestrator and human-approval chat seed', () => {
    const launch = resolveCatalogLaunch('dispatch-ai');
    expect(launch.path).toBe(PR_FLEET_HUB_PATH);
    expect(launch.registryId).toBe('dispatch-ai');
    expect(launch.orchestratorTool).toBeNull();
    expect(launch.chatSeed).toBe(dispatchAiChatConfig.chatSeed);
    expect(launch.chatSeed).toMatch(/human dispatcher must approve/i);
    expect(launch.openLabel).toBe('Start guided chat');
    expect(REGISTRY_ID_TO_ORCHESTRATOR_TOOL['dispatch-ai']).toBeUndefined();
  });

  it('exposes fleet-specific chat launch aria label', () => {
    const label = fleetChatAssistedLaunchAriaLabel('Dispatch Intelligence');
    expect(label).toMatch(/does not auto-assign/i);
    expect(label).toMatch(/Human dispatcher approval/i);
    expect(calculatorsSource).toContain('fleetChatAssistedLaunchAriaLabel');
    expect(calculatorsSource).toContain('calc-chat-assisted-group--fleet');
  });

  it.each(FLEET_DISPATCH_LAUNCH_PHRASES)(
    'phrase "%s" matches dispatch-ai keywords and disambiguation',
    (phrase) => {
      expect(messageMatchesToolKeywords(phrase, BACKEND_KEYWORDS_BY_TOOL['dispatch-ai'])).toBe(
        true
      );
      expect(messageTriggersBackendDisambiguation(phrase, 'dispatch-ai')).toBe(true);
    }
  );

  it.each(PR_FLEET_REQUIRED_NLU_ALIAS_PAIRS.filter(([, id]) => id === 'dispatch-ai'))(
    'alias "%s" resolves same hub launch as dispatch-ai',
    (alias) => {
      const fromAlias = resolveCatalogLaunch(alias);
      const fromCanonical = resolveCatalogLaunch('dispatch-ai');
      expect(fromAlias.registryId).toBe('dispatch-ai');
      expect(fromAlias.path).toBe(fromCanonical.path);
      expect(fromAlias.chatSeed).toBe(fromCanonical.chatSeed);
    }
  );

  it('navigates dispatch-ai chat launch to chat (not calculators slug)', () => {
    const launch = resolveCatalogLaunch('dispatch-ai');
    expect(resolveNavigationPathForLaunch(launch)).toBe('/assistant');
    expect(launch.path).toBe(PR_FLEET_HUB_PATH);
  });

  it('registers dispatch-ai in fleet-dispatch chat hub group', () => {
    const group = CHAT_ASSISTED_HUB_GROUPS.find((g) => g.groupId === 'fleet-dispatch');
    expect(group?.toolIds).toEqual(['dispatch-ai']);
    expect(group?.lead).toMatch(/does not auto-assign/i);
    expect(toolRegistryById['dispatch-ai']?.panelTool).toBe('calculators');
  });
});

describe('5. Registry mappings', () => {
  it.each(PR_FLEET_TOOL_IDS)('%s maps toolRegistry, NLU, and orchestrator consistently', (id) => {
    const spec = PR_FLEET_TOOL_SPECS[id];
    const reg = toolRegistryById[id];
    expect(reg?.id).toBe(id);
    expect(reg?.path).toBe(spec.routePath);
    expect(reg?.category).toBe('Fleet');

    const nlu = clinicalIntentToolsById[id];
    expect(nlu?.toolId).toBe(id);
    expect(nlu?.path).toBe(spec.routePath);
    expect(nlu?.category).toBe('fleet');
    expect(ORCHESTRATOR_TO_REGISTRY_ID[id]).toBe(id);
    expect(patternsSource).toContain(`toolId: '${id}'`);
    expect(patternsSource).toContain(spec.backendHelper);
  });

  it.each(FLEET_REGISTRY_NLU_PHRASES)(
    'NLU phrase "%s" resolves to %s',
    (phrase, canonical) => {
      expect(NLU_TO_REGISTRY_ID[phrase]).toBe(canonical);
      expect(resolveRegistryId(phrase)).toBe(canonical);
    }
  );

  it('lists each fleet tool exactly once in toolRegistry', () => {
    const fleetRows = toolRegistry.filter((t) => PR_FLEET_TOOL_IDS.includes(t.id));
    expect(fleetRows).toHaveLength(PR_FLEET_TOOL_IDS.length);
  });

  it.each(PR_FLEET_TOOL_IDS)('%s has no POST orchestrator executor mapping', (id) => {
    expect(REGISTRY_ID_TO_ORCHESTRATOR_TOOL[id]).toBeUndefined();
  });

  it('maps dispatch-ai as chat-assisted without orchestrator POST id', () => {
    expect(clinicalIntentToolsById['dispatch-ai']?.backendRouted).toBe(true);
    expect(clinicalIntentToolsById['dispatch-ai']?.postExecutable).toBe(false);
    expect(REGISTRY_ID_TO_ORCHESTRATOR_TOOL['dispatch-ai']).toBeUndefined();
  });
});

describe('6. Catalog inclusion', () => {
  it.each(PR_FLEET_TOOL_IDS)('%s has exactly one medical catalog row', (id) => {
    const spec = PR_FLEET_TOOL_SPECS[id];
    const rows = getMedicalToolsCatalogRows();
    const matches = rows.filter((r) => r.primaryId === id);
    expect(matches).toHaveLength(1);
    const row = matches[0];
    expect(row.pagePath).toBe(spec.routePath);
    expect(row.sidebarToolId).toBe(id);
    expect(row.chatOnlyForm).toBe(spec.chatOnlyForm);
    expect(row.category).toBe('fleet');
    expect(row.chatSeed.length).toBeGreaterThan(40);
    expect(row.backendExecutor).toBe(spec.backendExecutable);
  });

  it.each(PR_FLEET_TOOL_IDS)('catalog search queries find %s', (id) => {
    const spec = PR_FLEET_TOOL_SPECS[id];
    const rows = getMedicalToolsCatalogRows();
    for (const [, query] of spec.catalogSearchQueries) {
      const hits = catalogRowsMatchingQuery(rows, query);
      expect(hits.some((r) => r.primaryId === id), `query "${query}"`).toBe(true);
    }
  });

  it('includes fleet tools only in fleet category rows', () => {
    const rows = getMedicalToolsCatalogRows();
    const fleetRows = rows.filter((r) => PR_FLEET_TOOL_IDS.includes(r.primaryId));
    expect(fleetRows).toHaveLength(PR_FLEET_TOOL_IDS.length);
    for (const row of fleetRows) {
      expect(row.category).toBe('fleet');
    }
  });
});

describe('7. Discovery inclusion', () => {
  it.each(PR_FLEET_TOOL_IDS)('%s appears in getAllDiscoveredTools', (id) => {
    const merged = getAllDiscoveredTools();
    expect(merged.filter((r) => r.id === id).length).toBeGreaterThanOrEqual(1);
  });

  it('maps fleet discovery aliases to canonical registry ids', () => {
    for (const id of PR_FLEET_TOOL_IDS) {
      const aliases = toolIdAliases.filter((a) => a.mapsTo === id).map((a) => a.id);
      expect(aliases.length).toBeGreaterThan(0);
      for (const aliasId of aliases) {
        expect(resolveRegistryId(aliasId)).toBe(id);
      }
    }
  });

  it('has no conflicting alias targets within PR-FLEET pairs', () => {
    const targetByAlias = new Map();
    for (const [alias, canonical] of PR_FLEET_ALL_ALIAS_PAIRS) {
      if (targetByAlias.has(alias) && targetByAlias.get(alias) !== canonical) {
        throw new Error(
          `Conflicting PR-FLEET alias "${alias}": ${targetByAlias.get(alias)} vs ${canonical}`
        );
      }
      targetByAlias.set(alias, canonical);
    }
  });

  it.each(PR_FLEET_DISCOVERY_ALIAS_PAIRS)(
    'discovery alias "%s" resolves to %s',
    (alias, canonical) => {
      expect(resolveRegistryId(alias)).toBe(canonical);
      const merged = getAllDiscoveredTools();
      expect(merged.some((r) => r.id === alias || r.id === canonical)).toBe(true);
    }
  );
});

describe('8. Archived route validation', () => {
  it.each(PR_FLEET_TIER_A_IDS)('%s remains archived outside active App routes', (id) => {
    const spec = PR_FLEET_TOOL_SPECS[id];
    expect(appSource).not.toContain(`path: '${spec.routePath}'`);
    expect(appSource).not.toContain(`path="${spec.routePath}"`);
    expect(appSource).not.toContain(spec.appComponent);
    expect(appSource).toContain('CANONICAL_ROUTES.emergencyWhiteboard');
    expect(appSource).not.toContain(`path: '/tools/calculators/${id}'`);
    expect(calculatorsSource).not.toContain(`case '${id}':`);
    expect(nluCalculatorHubOnly.some((h) => h.toolId === id)).toBe(false);
  });

  it.each(PR_FLEET_TIER_B_IDS)('%s resolves hub path only without dedicated fleet route', (id) => {
    const launch = resolveCatalogLaunch(id);
    expect(launch.path).toBe(PR_FLEET_HUB_PATH);
    expect(appSource).not.toContain(`path: '/fleet/${id}'`);
    expect(appSource).not.toContain(`path: '/tools/calculators/${id}'`);
    expect(nluCalculatorHubOnly.some((h) => h.toolId === id)).toBe(true);
  });

  it.each(PR_FLEET_TOOL_IDS)('resolveCatalogLaunch(%s) matches spec routePath', (id) => {
    const spec = PR_FLEET_TOOL_SPECS[id];
    const launch = resolveCatalogLaunch(id);
    expect(launch.registryId).toBe(id);
    expect(launch.path).toBe(spec.routePath);
    const expectedLabel = spec.hubOnly ? 'Start guided chat' : 'Open';
    expect(launch.openLabel).toBe(expectedLabel);
  });

  it.each(PR_FLEET_ALL_ALIAS_PAIRS)(
    'alias "%s" → %s resolves same path as canonical',
    (alias, canonical) => {
      const fromAlias = resolveCatalogLaunch(alias);
      const fromCanonical = resolveCatalogLaunch(canonical);
      expect(fromAlias.registryId).toBe(canonical);
      expect(fromAlias.path).toBe(fromCanonical.path);
    }
  );

  it('returns empty launch for unknown fleet-like ids', () => {
    const empty = resolveCatalogLaunch('not-a-fleet-tool-xyz-123');
    expect(empty.path).toBe('/assistant');
    expect(empty.registryId).toBeNull();
  });

  it.each(PR_FLEET_TOOL_IDS)('%s NLU keywords and disambiguation are documented', (id) => {
    const spec = PR_FLEET_TOOL_SPECS[id];
    expect(BACKEND_KEYWORDS_BY_TOOL[id].length).toBeGreaterThan(3);
    expect(patternsSource).toContain(spec.backendHelper);
  });

  it.each([
    ['fleet-command', 'open fleet command dashboard utilization'],
    ['predictive-maintenance', 'predictive maintenance inspection window diagnostic code'],
    ['route-optimizer', 'route optimizer delivery route stop sequence'],
    ['dispatch-ai', 'fleet dispatch assign vehicle bottleneck'],
  ])('disambiguation triggers for %s', (toolId, message) => {
    expect(messageTriggersBackendDisambiguation(message, toolId)).toBe(true);
    expect(messageMatchesToolKeywords(message, BACKEND_KEYWORDS_BY_TOOL[toolId])).toBe(true);
  });

  it.each(FLEET_TIER_A_ROUTE_PATHS)('%s is a known fleet area path in route registry', (path) => {
    expect(isFleetAreaPath(path)).toBe(true);
    expect(isKnownToolAreaPath(path)).toBe(true);
    expect(REGISTRY_TOOL_PATHS).toContain(path);
  });

  it.each(PR_FLEET_TOOL_IDS)('expectedLaunchPath(%s) matches catalog launch path', (id) => {
    expect(expectedLaunchPath(id)).toBe(resolveCatalogLaunch(id).path);
    expect(expectedLaunchPath(id)).toBe(PR_FLEET_TOOL_SPECS[id].routePath);
  });
});
