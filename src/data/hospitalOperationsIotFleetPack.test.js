import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { getRegistryToolNavigation } from '../navigation/registryToolLaunch';
import { resolveCatalogLaunch } from './clinicalCatalogWiring';
import {
  CANONICAL_TOOL_GROUPS,
  HOSPITAL_OPERATIONS_TIER_A_CALCULATOR_REGISTRY_IDS,
  HOSPITAL_OPERATIONS_TIER_B_CHAT_REGISTRY_IDS,
  REGISTRY,
} from './clinicalToolIdContract';
import { clinicalIntentToolsById } from './clinicalIntentToolCatalog';
import { getUserFacingToolRegistryProjection } from './toolInventory';
import { toolRegistryById } from './toolRegistry';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendPatternsSource = readFileSync(
  join(__dirname, '../../backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts'),
  'utf8'
);

const tierA = [
  REGISTRY.bedOccupancyCalculator,
  REGISTRY.staffingRatioCalculator,
  REGISTRY.turnaroundTimeCalculator,
  REGISTRY.resourceUtilizationIndex,
];

const tierB = [
  REGISTRY.dispatchAi,
  REGISTRY.hospitalCommandAssistant,
  REGISTRY.resourceAllocationAssistant,
  REGISTRY.deviceRecommendationAssistant,
];

const tierC = [
  REGISTRY.hospitalMap,
  REGISTRY.fleetLiveMap,
  REGISTRY.medicalIotDashboard,
  REGISTRY.deviceFleetManagement,
  REGISTRY.predictiveMaintenance,
  REGISTRY.routeOptimizer,
  REGISTRY.assetTrackingDashboard,
  REGISTRY.telemetryMonitoring,
  REGISTRY.incidentCommandCenter,
  REGISTRY.hospitalOperationsCockpit,
  REGISTRY.deviceBatteryIntelligence,
  REGISTRY.capacityPredictionEngine,
];

describe('Hospital Operations, Medical IoT, and Fleet Tools Pack', () => {
  it('registers Tier A calculators as launchable calculator forms', () => {
    expect(HOSPITAL_OPERATIONS_TIER_A_CALCULATOR_REGISTRY_IDS).toEqual(tierA);

    for (const id of tierA) {
      const registry = toolRegistryById[id];
      const launch = resolveCatalogLaunch(id);
      const nav = getRegistryToolNavigation(id);

      expect(registry?.panelTool, id).toBe('calculators');
      expect(registry?.initialCalc, id).toBe(id);
      expect(launch.path, id).toBe(`/tools/calculators/${id}`);
      expect(nav.mode, id).toBe('calculator-route');
      expect(nav.pathname, id).toBe(`/tools/calculators/${id}`);
    }
  });

  it('registers Tier B assistants as chat-assisted tools with human approval guardrails', () => {
    expect(HOSPITAL_OPERATIONS_TIER_B_CHAT_REGISTRY_IDS).toEqual(tierB.slice(1));

    for (const id of tierB) {
      const launch = resolveCatalogLaunch(id);
      const nav = getRegistryToolNavigation(id);
      const seed = launch.chatSeed || '';

      expect(nav.mode, id).toBe('chat-assisted');
      expect(launch.registryId, id).toBe(id);
      expect(seed, id).toMatch(/human|approval|do not|does not/i);
      expect(seed, id).toMatch(/autonomous|auto-assign|auto-dispatch|dispatch|resource|device/i);
      expect(backendPatternsSource, id).toContain(`toolId: '${id}'`);
    }
  });

  it('registers Tier C dashboards, maps, and engines as visible launchable surfaces', () => {
    const visibleIds = getUserFacingToolRegistryProjection().map((tool) => tool.id);

    for (const id of tierC) {
      const registry = toolRegistryById[id];
      const launch = resolveCatalogLaunch(id);
      const nav = getRegistryToolNavigation(id);

      expect(visibleIds, id).toContain(id);
      expect(registry?.path, id).toMatch(/^\/(hospital-map|medical-iot|devices|fleet\/)/);
      expect(launch.path, id).toBe(registry?.path);
      expect(nav.mode, id).toBe('tool-page');
      expect(nav.pathname, id).toBe(registry?.path);
    }
  });

  it('keeps map and demo-telemetry requirements explicit', () => {
    expect(toolRegistryById[REGISTRY.hospitalMap].features.join(' ')).toMatch(/Demo telemetry/i);
    expect(toolRegistryById[REGISTRY.fleetLiveMap].description).toMatch(/map/i);
    expect(toolRegistryById[REGISTRY.medicalIotDashboard].features.join(' ')).toMatch(/telemetry/i);
    expect(CANONICAL_TOOL_GROUPS.liveTrackingMaps).toContain(REGISTRY.fleetLiveMap);
    expect(CANONICAL_TOOL_GROUPS.hospitalOperations).toEqual(
      expect.arrayContaining([
        REGISTRY.assetTrackingDashboard,
        REGISTRY.incidentCommandCenter,
        REGISTRY.hospitalOperationsCockpit,
        REGISTRY.capacityPredictionEngine,
      ])
    );
  });

  it('keeps backend contracts non-autonomous for operations assistants', () => {
    for (const id of tierB.slice(1)) {
      const row = clinicalIntentToolsById[id];

      expect(row?.backendExecutable, id).toBe(false);
      expect(row?.description, id).toMatch(/no autonomous|does not/i);
      expect(row?.chatSeed, id).toMatch(/do not|human approval/i);
    }
  });
});
