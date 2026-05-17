/**
 * Fleet Command Dashboard (fleet-command) wiring contracts.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
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
const appSource = readFileSync(join(__dirname, '../App.jsx'), 'utf8');
const patternsSource = readFileSync(
  join(
    __dirname,
    '../../backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts'
  ),
  'utf8'
);

describe('Fleet Command (fleet-command) wiring', () => {
  const id = 'fleet-command';
  const path = '/fleet/command';

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

  it('registers App.jsx route', () => {
    expect(appSource).toContain(`path: '${path}'`);
    expect(appSource).toContain('FleetDashboard');
  });

  it('mirrors backend tool.patterns.ts toolId', () => {
    expect(patternsSource).toContain("toolId: 'fleet-command'");
    expect(patternsSource).toContain('preferFleetCommand');
  });

  it('resolves NLU aliases and catalog launch', () => {
    expect(NLU_TO_REGISTRY_ID['fleet command']).toBe(id);
    expect(NLU_TO_REGISTRY_ID['fleet-dashboard']).toBe(id);
    expect(resolveRegistryId('fleet-overview')).toBe(id);
    const launch = resolveCatalogLaunch(id);
    expect(launch.path).toBe(path);
    expect(launch.registryId).toBe(id);
    expect(launch.chatSeed).toMatch(/Do not auto-dispatch/i);
  });

  it('includes fleet-command in discovery and medical catalog rows', () => {
    const discovered = getAllDiscoveredTools().filter((r) => r.id === id);
    expect(discovered.length).toBeGreaterThanOrEqual(1);
    const rows = getMedicalToolsCatalogRows().filter((r) => r.primaryId === id);
    expect(rows).toHaveLength(1);
    expect(rows[0].pagePath).toBe(path);
    expect(rows[0].chatOnRequest).toBe(true);
  });

  it('documents discovery aliases', () => {
    const ids = toolIdAliases.filter((a) => a.mapsTo === id).map((a) => a.id);
    expect(ids).toContain('fleet-dashboard');
    expect(ids).toContain('fleet-overview');
  });
});
