import { describe, expect, it } from 'vitest';
import { getRegistryToolNavigation } from '../navigation/registryToolLaunch';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { resolveCatalogLaunch, resolveRegistryId } from './clinicalCatalogWiring';
import { REGISTRY } from './clinicalToolIdContract';
import { getFrontendVisibleToolInventory } from './toolInventory';
import { buildCommandDashboardModel } from './commandDashboardModel';

const EXPECTED_TOOLS = Object.freeze([
  { id: REGISTRY.simulationSuite, route: '/simulation', alias: 'start simulation' },
  {
    id: REGISTRY.scenarioPlayer,
    route: '/simulation/sepsis-deterioration',
    alias: 'practice sepsis scenario',
  },
  {
    id: REGISTRY.simulationOutcomes,
    route: '/simulation/outcomes',
    alias: 'show my simulation outcomes',
  },
  {
    id: REGISTRY.debriefDashboard,
    route: '/simulation/sepsis-deterioration',
    alias: 'debrief my scenario',
  },
  {
    id: REGISTRY.competencyDashboard,
    route: '/simulation/outcomes',
    alias: 'competency dashboard',
  },
  { id: REGISTRY.laboratoryDashboard, route: '/laboratory', alias: 'show lab dashboard' },
  { id: REGISTRY.medical3dViewer, route: '/3d-viewer', alias: 'open 3d viewer' },
]);

describe('simulation, laboratory, and 3D viewer wiring', () => {
  it('exposes simulation platform tools in the unified frontend inventory', () => {
    const inventoryById = Object.fromEntries(
      getFrontendVisibleToolInventory().map((tool) => [tool.id, tool]),
    );

    for (const tool of EXPECTED_TOOLS) {
      expect(inventoryById[tool.id], tool.id).toBeTruthy();
      expect(inventoryById[tool.id].route).toBe(tool.route);
      expect(inventoryById[tool.id].navigationPath).toBe(tool.route);
      expect(JSON.stringify(inventoryById[tool.id].component)).toMatch(/src\/pages\//);
    }
  });

  it('resolves assistant launch aliases without null launch targets', () => {
    for (const tool of EXPECTED_TOOLS) {
      expect(resolveRegistryId(tool.alias)).toBe(tool.id);
      const launch = resolveCatalogLaunch(tool.alias);
      expect(launch.path).toBe(tool.route);
      expect(launch.registryId).toBe(tool.id);
      expect(launch.chatSeed).toMatch(/clinical decision support|demo|training|diagnostic/i);
      const navigation = getRegistryToolNavigation(tool.alias);
      expect(navigation.pathname, tool.id).toBe(CANONICAL_ROUTES.emergencyTools);
      expect(navigation.search, tool.id).toContain(tool.id);
      expect(navigation.registryId).toBe(tool.id);
    }
  });

  it('adds simulation platform tools to dashboard quick-launch inventory groups', () => {
    const model = buildCommandDashboardModel();
    expect(model.panels.expandedCare.map((tool) => tool.id)).toEqual(
      expect.arrayContaining(EXPECTED_TOOLS.map((tool) => tool.id)),
    );
    expect(model.panels.expandedCare.map((tool) => tool.id)).toEqual(
      expect.arrayContaining([REGISTRY.competencyPlatform, REGISTRY.credentialingPlatform]),
    );
  });
});
