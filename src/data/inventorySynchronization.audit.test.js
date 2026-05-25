import { describe, it, expect } from 'vitest';
import { clinicalIntentTools } from './clinicalIntentToolCatalog';
import toolRegistry from './toolRegistry';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools } from './sourceCodeToolDiscovery';
import { resolveCatalogLaunch } from './clinicalCatalogWiring';
import { parseClinicalToolPatterns } from './parseToolPatterns';
import { readToolPatternsSource } from './clinicalToolAliasSync';

function idSet(values) {
  return new Set(values.filter(Boolean));
}

describe('inventory synchronization audit', () => {
  it('keeps canonical intent tool ids synchronized across frontend catalogs and backend patterns', () => {
    const intentIds = idSet(clinicalIntentTools.map((tool) => tool.toolId));
    const rows = getMedicalToolsCatalogRows();
    const catalogIds = idSet(rows.flatMap((row) => [row.id, row.primaryId, row.sidebarToolId]));
    const sourceDiscoveryIds = idSet(getAllDiscoveredTools().map((tool) => tool.id));
    const backendPatternIds = idSet(
      parseClinicalToolPatterns(readToolPatternsSource()).map((pattern) => pattern.toolId)
    );

    for (const id of intentIds) {
      const launch = resolveCatalogLaunch(id);
      expect(launch.path || launch.chatSeed, `launch missing ${id}`).toBeTruthy();
      expect(catalogIds.has(id), `catalog missing ${id}`).toBe(true);
      expect(sourceDiscoveryIds.has(id), `source discovery missing ${id}`).toBe(true);
      expect(backendPatternIds.has(id), `backend pattern missing ${id}`).toBe(true);
    }
  });

  it('ensures every sidebar tool is represented by catalog/discovery launch surfaces', () => {
    const catalogIds = idSet(getMedicalToolsCatalogRows().flatMap((row) => [row.id, row.primaryId, row.sidebarToolId]));
    const sourceDiscoveryIds = idSet(getAllDiscoveredTools().map((tool) => tool.id));

    for (const tool of toolRegistry) {
      expect(catalogIds.has(tool.id) || sourceDiscoveryIds.has(tool.id), tool.id).toBe(true);
    }
  });
});
