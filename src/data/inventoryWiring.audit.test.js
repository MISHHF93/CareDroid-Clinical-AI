import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import toolRegistry from './toolRegistry';
import { clinicalIntentTools } from './clinicalIntentToolCatalog';
import { getWiredClinicalIntentTools } from './clinicalCatalogWiring';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools } from './sourceCodeToolDiscovery';

const repoRoot = path.resolve(__dirname, '../..');
const backendPatternsPath = path.resolve(repoRoot, 'backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts');

function extractBackendToolIds() {
  const src = fs.readFileSync(backendPatternsPath, 'utf8');
  return new Set([...src.matchAll(/toolId:\s*'([^']+)'/g)].map((m) => m[1]));
}

describe('Inventory + backend/frontend wiring audit', () => {
  it('keeps frontend inventory IDs synchronized across all discovery/catalog surfaces', () => {
    const registryIds = new Set(toolRegistry.map((tool) => tool.id));
    const intentIds = new Set(clinicalIntentTools.map((tool) => tool.toolId));
    const wiringIds = new Set(getWiredClinicalIntentTools().map((tool) => tool.toolId));
    const indexIds = new Set(getMedicalToolsCatalogRows().map((tool) => tool.id));
    const discoveryIds = new Set(getAllDiscoveredTools().map((tool) => tool.id));

    for (const id of registryIds) {
      expect(indexIds.has(id), `Missing ${id} in medicalToolsCatalogIndex`).toBe(true);
      expect(discoveryIds.has(id), `Missing ${id} in sourceCodeToolDiscovery`).toBe(true);
    }

    for (const id of intentIds) {
      expect(wiringIds.has(id), `Missing ${id} in clinicalCatalogWiring mirror`).toBe(true);
      expect(indexIds.has(id), `Missing ${id} in medicalToolsCatalogIndex`).toBe(true);
      expect(discoveryIds.has(id), `Missing ${id} in sourceCodeToolDiscovery`).toBe(true);
    }
  });

  it('keeps backend tool pattern IDs represented in frontend inventory', () => {
    const frontendIds = new Set(getMedicalToolsCatalogRows().map((tool) => tool.id));
    const backendIds = extractBackendToolIds();
    const allowedBackendOnly = new Set(['sofa-calculator']);

    for (const id of backendIds) {
      if (allowedBackendOnly.has(id)) continue;
      expect(frontendIds.has(id), `Backend tool pattern ${id} missing from frontend inventory`).toBe(true);
    }
  });
});
