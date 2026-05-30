import { describe, expect, it } from 'vitest';
import { REGISTRY } from './clinicalToolIdContract';
import { buildCommandDashboardModel, COMMAND_DASHBOARD_GROUPS } from './commandDashboardModel';
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
});
