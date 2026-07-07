/**
 * Predictive Maintenance Assistant (predictive-maintenance) wiring contracts.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { toolRegistryById } from './toolRegistry';
import { clinicalIntentTools } from './clinicalIntentToolCatalog';
import {
  resolveCatalogLaunch,
  NLU_TO_REGISTRY_ID,
  PR_FLEET_TIER_A_REGISTRY_IDS,
  resolveRegistryId,
} from './clinicalCatalogWiring';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools, toolIdAliases } from './sourceCodeToolDiscovery';

const __dirname = dirname(fileURLToPath(import.meta.url));
const predictiveMaintenanceSource = readFileSync(
  join(__dirname, '../pages/fleet/PredictiveMaintenance.tsx'),
  'utf8',
);
const patternsSource = readFileSync(
  join(
    __dirname,
    '../../backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts'
  ),
  'utf8'
);

describe('Predictive Maintenance (predictive-maintenance) wiring', () => {
  const id = 'predictive-maintenance';
  const path = '/fleet/predictive-maintenance';

  it('is listed in PR-FLEET Tier-A audit ids', () => {
    expect(PR_FLEET_TIER_A_REGISTRY_IDS).toContain(id);
  });

  it('keeps registry and NLU aligned', () => {
    const reg = toolRegistryById[id];
    expect(reg?.path).toBe(path);
    expect(reg?.category).toBe('Fleet');

    const nlu = clinicalIntentTools.find((t) => t.toolId === id);
    expect(nlu?.path).toBe(path);
    expect(nlu?.sidebarToolId).toBe(id);
    expect(nlu?.backendExecutable).toBe(false);
    expect(nlu?.category).toBe('fleet');
  });

  it('keeps the fleet page component available at its canonical route', () => {
    expect(predictiveMaintenanceSource).toContain('PredictiveMaintenance');
    expect(CANONICAL_ROUTES.fleetPredictiveMaintenance).toBe(path);
  });

  it('mirrors backend tool.patterns.ts toolId', () => {
    expect(patternsSource).toContain("toolId: 'predictive-maintenance'");
    expect(patternsSource).toContain('preferPredictiveMaintenance');
  });

  it('resolves NLU aliases and catalog launch', () => {
    expect(NLU_TO_REGISTRY_ID['predictive maintenance']).toBe(id);
    expect(NLU_TO_REGISTRY_ID['maintenance-assistant']).toBe(id);
    expect(resolveRegistryId('fleet-maintenance-risk')).toBe(id);
    const launch = resolveCatalogLaunch(id);
    expect(launch.path).toBe(path);
    expect(launch.registryId).toBe(id);
    expect(launch.chatSeed).toMatch(/Do not auto-schedule/i);
  });

  it('includes predictive-maintenance in discovery and medical catalog rows', () => {
    const discovered = getAllDiscoveredTools().filter((r) => r.id === id);
    expect(discovered.length).toBeGreaterThanOrEqual(1);
    const rows = getMedicalToolsCatalogRows().filter((r) => r.primaryId === id);
    expect(rows).toHaveLength(1);
    expect(rows[0].pagePath).toBe(path);
    expect(rows[0].chatOnRequest).toBe(true);
  });

  it('documents discovery aliases', () => {
    const ids = toolIdAliases.filter((a) => a.mapsTo === id).map((a) => a.id);
    expect(ids).toContain('maintenance-assistant');
    expect(ids).toContain('fleet-maintenance-risk');
  });
});
