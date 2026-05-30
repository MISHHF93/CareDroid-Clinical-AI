/**
 * Nest controller route scan ↔ inventory parity.
 */

import { describe, it, expect } from 'vitest';
import {
  buildEffectiveHttpPath,
  compareControllerScanToInventory,
  parseControllerRoutesFromSource,
  scanNestControllerRoutes,
} from './backendControllerRouteScan';

describe('backendControllerRouteScan', () => {
  it('maps AppController GET health outside /api prefix', () => {
    expect(buildEffectiveHttpPath('', 'health', 'GET')).toBe('/health');
    expect(buildEffectiveHttpPath('', 'health', 'POST')).toBe('/api/health');
    expect(buildEffectiveHttpPath('', 'config/system')).toBe('/api/config/system');
  });

  it('maps empty handler to controller root', () => {
    expect(buildEffectiveHttpPath('tools', '')).toBe('/api/tools');
    expect(buildEffectiveHttpPath('drugs', '', 'POST')).toBe('/api/drugs');
    expect(buildEffectiveHttpPath('metrics', '')).toBe('/api/metrics');
  });

  it('parses tool orchestrator routes', () => {
    const sample = `
      @Controller('tools')
      export class ToolOrchestratorController {
        @Get('catalog/executors')
        x() {}
        @Post(':id/execute')
        y() {}
      }
    `;
    const routes = parseControllerRoutesFromSource(sample, 'tool-orchestrator.controller.ts');
    expect(routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ method: 'GET', path: '/api/tools/catalog/executors' }),
        expect.objectContaining({ method: 'POST', path: '/api/tools/:id/execute' }),
      ])
    );
  });

  it('matches scanned controllers to BACKEND_HTTP_ROUTES', () => {
    const { missingInInventory, missingInControllers } = compareControllerScanToInventory();
    expect(missingInInventory).toEqual([]);
    expect(missingInControllers).toEqual([]);
  });

  it('does not expose duplicate active controller method/path pairs', () => {
    const routes = scanNestControllerRoutes();
    const keys = routes.map((route) => `${route.method} ${route.path}`);
    const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);

    expect(duplicates).toEqual([]);
  });
});
