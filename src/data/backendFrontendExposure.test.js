/**
 * Production exposure scan — backend routes, frontend calls, executors, Vite proxy.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  assertExposureScanPasses,
  readViteDevConfig,
  runBackendFrontendExposureScan,
} from './backendFrontendExposure';
import { findBackendRoute, BACKEND_HTTP_ROUTES } from './backendHttpRouteInventory';
import { FRONTEND_API_CALLS } from './frontendApiCallsInventory';
import { BACKEND_EXECUTOR_NLU_TOOL_IDS } from '../config/backendApiCapabilities';

const __dirname = dirname(fileURLToPath(import.meta.url));
const registrySource = readFileSync(
  join(
    __dirname,
    '../../backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.registry.ts'
  ),
  'utf8'
);

describe('backendFrontendExposure scan', () => {
  it('passes with zero unguarded missing routes and no false executor claims', () => {
    const { ok, errors } = assertExposureScanPasses();
    expect(errors, errors.join('; ')).toEqual([]);
    expect(ok).toBe(true);
  });

  it('inventory covers three POST executors', () => {
    const scan = runBackendFrontendExposureScan();
    expect(scan.executorNluIds).toEqual([...BACKEND_EXECUTOR_NLU_TOOL_IDS]);
    expect(scan.executorNluIds).toHaveLength(3);

    for (const id of BACKEND_EXECUTOR_NLU_TOOL_IDS) {
      expect(findBackendRoute('POST', `/api/tools/${id}/execute`)).toBeTruthy();
    }
  });

  it('gates known missing routes behind disabled capabilities', () => {
    const gatedIds = [
      'tools-share-results',
      'team-users',
      'bulk-sync',
      'chat-messages-sync',
      'notifications-stream',
      'clinical-alerts-ack',
      'exports-pdf',
      'reports-schedule-create',
    ];
    const scan = runBackendFrontendExposureScan();
    for (const id of gatedIds) {
      const row = scan.analyzed.find((c) => c.id === id);
      expect(row, `missing inventory row ${id}`).toBeTruthy();
      expect(row.exposure).toBe('gated-stub');
    }
  });

  it('matches backend REGISTERED_EXECUTOR_TOOL_IDS in registry source', () => {
    const block = registrySource.match(/REGISTERED_EXECUTOR_TOOL_IDS\s*=\s*\[([\s\S]*?)\]\s*as const/);
    const backendIds = [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
    expect(backendIds).toEqual([...BACKEND_EXECUTOR_NLU_TOOL_IDS].sort());
  });

  it('audit controller uses single /api prefix (not /api/api/audit)', () => {
    const auditRoutes = BACKEND_HTTP_ROUTES.filter((r) => r.path.includes('audit'));
    expect(auditRoutes.every((r) => r.path.startsWith('/api/audit'))).toBe(true);
    expect(auditRoutes.some((r) => r.path.includes('/api/api/'))).toBe(false);
  });

  it('every frontend inventory entry resolves exposure status', () => {
    expect(FRONTEND_API_CALLS.length).toBeGreaterThan(30);
    const scan = runBackendFrontendExposureScan();
    expect(scan.analyzed).toHaveLength(FRONTEND_API_CALLS.length);
    expect(scan.unguarded).toHaveLength(0);
  });
});

describe('Vite proxy and ports', () => {
  it('serves frontend on port 8000 and proxies API to localhost:3000', () => {
    const vite = readViteDevConfig();
    expect(vite.devPort).toBe(8000);
    expect(vite.proxyTarget).toBe('http://localhost:3000');
    expect(vite.proxiesApi).toBe(true);
    expect(vite.proxiesHealth).toBe(true);
    expect(vite.proxiesSocketIo).toBe(true);
  });
});
