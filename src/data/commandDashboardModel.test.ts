import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { REGISTRY } from './clinicalToolIdContract';
import {
  buildCapabilityReachabilityAudit,
  buildCommandDashboardModel,
  COMMAND_DASHBOARD_GROUPS,
} from './commandDashboardModel';
import { getMountedCapabilityGraph } from './mountedCapabilityGraph';
import { getUserFacingToolRegistryProjection } from './toolInventory';

describe('command dashboard model', () => {
  it('derives featured panels from the canonical user-facing inventory', () => {
    const inventory = getUserFacingToolRegistryProjection();
    const inventoryIds = new Set(inventory.map((tool) => tool.id));
    const model = buildCommandDashboardModel(inventory);
    const featured = [
      ...model.panels.clinicalTools,
      ...model.panels.calculators,
      ...model.panels.referenceGuidelines,
      ...model.panels.fleetOperations,
      ...model.panels.medicalIot,
      ...model.panels.expandedCare,
    ];

    expect(model.stats.totalTools).toBe(inventory.length);
    expect(model.stats.aiTools).toBeGreaterThan(0);
    expect(model.panels.clinicalTools.map((tool) => tool.id)).toContain(REGISTRY.qsofa);
    expect(model.panels.calculators.map((tool) => tool.id)).toContain(REGISTRY.qsofa);
    expect(model.panels.referenceGuidelines.map((tool) => tool.id)).toContain(REGISTRY.guidelineRag);
    expect(model.panels.fleetOperations.map((tool) => tool.id)).toContain(REGISTRY.liveTrackingMap);
    expect(model.panels.fleetOperations.map((tool) => tool.id)).toContain(REGISTRY.fleetLiveMap);
    expect(model.panels.fleetOperations.map((tool) => tool.id)).toContain(REGISTRY.fleetCommand);
    expect(model.panels.fleetOperations.map((tool) => tool.id)).toContain(REGISTRY.deviceFleetManagement);
    expect(model.panels.medicalIot.map((tool) => tool.id)).toContain(REGISTRY.medicalIotDashboard);
    expect(model.panels.expandedCare.map((tool) => tool.id)).toEqual([
      REGISTRY.competencyPlatform,
      REGISTRY.credentialingPlatform,
      REGISTRY.simulationSuite,
      REGISTRY.scenarioPlayer,
      REGISTRY.simulationOutcomes,
      REGISTRY.debriefDashboard,
      REGISTRY.competencyDashboard,
      REGISTRY.laboratoryDashboard,
      REGISTRY.medical3dViewer,
      REGISTRY.aiCostOptimization,
      REGISTRY.aiCommandCenter,
      REGISTRY.aiMemory,
      REGISTRY.aiTraining,
    ]);
    for (const tool of featured) {
      expect(inventoryIds.has(tool.id), tool.id).toBe(true);
    }
  });

  it('derives visualization distributions from unified inventory without duplicate counts', () => {
    const inventory = getUserFacingToolRegistryProjection();
    const model = buildCommandDashboardModel(inventory);
    const categoryTotal = model.visualizations.categoryDistribution.reduce((sum, item) => sum + item.value, 0);
    const launchTypeTotal = model.visualizations.launchTypeDistribution.reduce((sum, item) => sum + item.value, 0);

    expect(categoryTotal).toBe(inventory.length);
    expect(launchTypeTotal).toBe(inventory.length);
    expect(model.visualizations.tierDistribution.length).toBeGreaterThan(0);
    expect(model.visualizations.readinessDistribution.length).toBeGreaterThan(0);
  });

  it('keeps command dashboard card groups unique', () => {
    const model = buildCommandDashboardModel();

    for (const panel of Object.values(model.panels)) {
      const ids = panel.map((tool) => tool.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
    expect(model.panels.calculators.every((tool) => tool.category === 'Calculator' || tool.surface === 'calculator-form')).toBe(true);
  });

  it('keeps curated group ids explicit and registry-backed', () => {
    const registryIds = new Set(Object.values(REGISTRY));
    const curatedIds = Object.values(COMMAND_DASHBOARD_GROUPS).flat();

    expect(curatedIds.length).toBeGreaterThan(0);
    for (const id of curatedIds) {
      expect(registryIds.has(id), id).toBe(true);
    }
  });

  it('stitches major capabilities into dashboard, operations/tools, command, search, and AI alias reachability', () => {
    const graph = getMountedCapabilityGraph();
    const audit = buildCapabilityReachabilityAudit(graph);
    const byId = new Map(audit.map((row): [string, typeof row] => [row.capabilityId, row]));

    [
      REGISTRY.qsofa,
      REGISTRY.labInterp,
      REGISTRY.hospitalMap,
      REGISTRY.medicalIotDashboard,
      REGISTRY.deviceFleetManagement,
      REGISTRY.fleetLiveMap,
      REGISTRY.simulationSuite,
      REGISTRY.laboratoryDashboard,
      REGISTRY.medical3dViewer,
    ].forEach((id) => {
      const row = byId.get(id) as any;
      expect(row, id).toBeTruthy();
      if (!row) throw new Error(`expected capability reachability row for ${id}`);
      expect(row.dashboard, id).toBe(true);
      expect(row.command, id).toBe(true);
      expect(row.search, id).toBe(true);
      expect(row.aiAlias, id).toBe(true);
      expect(row.tools || row.operations, id).toBe(true);
    });
  });

  it('enriches dashboard panel tools with mounted SaaS metadata', () => {
    const model = buildCommandDashboardModel();
    const allPanelTools = Object.values(model.panels).flat();

    expect(allPanelTools.length).toBeGreaterThan(0);
    for (const tool of allPanelTools) {
      expect(tool.mountedCapability, tool.id).toBeTruthy();
      expect(tool.packIds.length, tool.id).toBeGreaterThan(0);
      expect(tool.productIds.length, tool.id).toBeGreaterThan(0);
      expect(tool.workspaceIds.length, tool.id).toBeGreaterThan(0);
      expect(tool.aiAliases.length, tool.id).toBeGreaterThan(0);
    }
  });

  it('duplicate-system-audit: Domain dashboards -- named dashboards with a real toolInventory record are reachable from a command dashboard panel', () => {
    // "Overlapping KPIs across ops/analytics pages" -- docs/duplicate-system-audit.md's
    // stated risk for this finding. Every one of these routes has a real toolInventory
    // record (verified by path match); each record's id must appear in some panel so the
    // dashboard is actually reachable from the command dashboard, not orphaned behind a
    // direct URL only. AnalyticsDashboard (/platform-analytics) and OutcomesDashboardPage
    // (/outcomes) are real, mounted pages with NO toolInventory record at all -- a deeper
    // catalog-completeness gap than this finding covers, intentionally left open.
    const tools = getUserFacingToolRegistryProjection();
    const model = buildCommandDashboardModel();
    const allPanelIds = new Set(Object.values(model.panels).flat().map((tool) => tool.id));
    const routeToId: Record<string, string> = {
      '/costs': REGISTRY.aiCostOptimization,
      '/ai-command-center': REGISTRY.aiCommandCenter,
      '/memory': REGISTRY.aiMemory,
      '/training': REGISTRY.aiTraining,
      '/laboratory': REGISTRY.laboratoryDashboard,
      '/medical-iot': REGISTRY.medicalIotDashboard,
      '/hospital-map': REGISTRY.hospitalMap,
      '/fleet/command': REGISTRY.fleetCommand,
    };
    for (const [route, id] of Object.entries(routeToId)) {
      expect(tools.some((tool) => tool.path === route || tool.route === route), route).toBe(true);
      expect(allPanelIds, `${route} (${id})`).toContain(id);
    }
  });

  it('duplicate-system-audit: Platform dashboard registry -- does not read platformOperatingSystem demo OS data', () => {
    // "Demo OS dashboards vs command dashboard tiles" -- docs/duplicate-system-audit.md's
    // stated risk for this finding. commandDashboardModel.ts is the canonical source for
    // the real command dashboard tiles rendered at /dashboard (CommandDashboard.tsx);
    // platformOperatingSystem.ts's PLATFORM_DASHBOARDS feeds unrelated capability-matrix /
    // search-discovery / saas-operating-system data layers only, never a rendered page.
    // Guard against a future import merging the two back together.
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(__dirname, 'commandDashboardModel.ts'), 'utf8');
    expect(source).not.toMatch(/platformOperatingSystem/);
  });
});
