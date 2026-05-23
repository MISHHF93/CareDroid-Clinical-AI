/**
 * Production exposure scan — backend routes, frontend calls, executors, Vite proxy.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  BACKEND_FRONTEND_CAPABILITY_CLASSIFICATIONS,
  assertExposureScanPasses,
  buildBackendFrontendCapabilityRows,
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
const repoRoot = join(__dirname, '../..');
const rootEnvExample = readFileSync(join(repoRoot, '.env.example'), 'utf8');
const backendEnvExample = readFileSync(join(repoRoot, 'backend/.env.example'), 'utf8');
const backendMainSource = readFileSync(join(repoRoot, 'backend/src/main.ts'), 'utf8');

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
    const auditRoutes = BACKEND_HTTP_ROUTES.filter((r) => r.controller === 'AuditController');
    expect(auditRoutes.every((r) => r.path.startsWith('/api/audit'))).toBe(true);
    expect(auditRoutes.some((r) => r.path.includes('/api/api/'))).toBe(false);
  });

  it('every frontend inventory entry resolves exposure status', () => {
    expect(FRONTEND_API_CALLS.length).toBeGreaterThan(30);
    const scan = runBackendFrontendExposureScan();
    expect(scan.analyzed).toHaveLength(FRONTEND_API_CALLS.length);
    expect(scan.unguarded).toHaveLength(0);
  });

  it('surfaces chat next-action and vitals endpoints through the canonical frontend inventory', () => {
    expect(FRONTEND_API_CALLS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ method: 'POST', path: '/api/chat/suggest-action' }),
        expect.objectContaining({ method: 'POST', path: '/api/chat/analyze-vitals' }),
      ])
    );
    expect(findBackendRoute('POST', '/api/chat/suggest-action')).toBeTruthy();
    expect(findBackendRoute('POST', '/api/chat/analyze-vitals')).toBeTruthy();
  });

  it('classifies frontend, backend-only, missing-route, and executor capabilities', () => {
    const rows = buildBackendFrontendCapabilityRows();
    const classifications = new Set(rows.map((row) => row.classification));
    expect(classifications).toContain(BACKEND_FRONTEND_CAPABILITY_CLASSIFICATIONS.USER_FACING_WIRED);
    expect(classifications).toContain(BACKEND_FRONTEND_CAPABILITY_CLASSIFICATIONS.BACKEND_ONLY_INTERNAL);
    expect(classifications).toContain(BACKEND_FRONTEND_CAPABILITY_CLASSIFICATIONS.USER_FACING_MISSING_FRONTEND_ROUTE);
    expect(classifications).toContain(BACKEND_FRONTEND_CAPABILITY_CLASSIFICATIONS.PLANNED_UNSUPPORTED);
    expect(
      rows.filter(
        (row) =>
          row.classification === BACKEND_FRONTEND_CAPABILITY_CLASSIFICATIONS.FRONTEND_VISIBLE_BACKEND_MISSING
      )
    ).toEqual([]);

    const executorRows = rows.filter((row) => row.source === 'user-facing-tool');
    expect(executorRows.map((row) => row.orchestratorToolId).sort()).toEqual(
      [...BACKEND_EXECUTOR_NLU_TOOL_IDS].sort()
    );
    expect(executorRows.every((row) => row.classification === 'user-facing and wired')).toBe(true);
  });
});

describe('Vite proxy and ports', () => {
  it('serves frontend on port 8000 and proxies API/health/socket in dev and preview', () => {
    const vite = readViteDevConfig();
    expect(vite.devPort).toBe(8000);
    expect(vite.previewPort).toBe(4173);
    expect(vite.proxyTarget).toBe('http://localhost:3000');
    expect(vite.proxiesApi).toBe(true);
    expect(vite.proxiesHealth).toBe(true);
    expect(vite.proxiesSocketIo).toBe(true);
    expect(vite.serverUsesProxyHelper).toBe(true);
    expect(vite.previewUsesProxyHelper).toBe(true);
  });

  it('keeps local example URLs aligned to Vite dev port and metrics route', () => {
    expect(rootEnvExample).toContain('VITE_PRIVACY_POLICY_URL=http://localhost:8000/privacy');
    expect(rootEnvExample).not.toMatch(/localhost:5173/);
    expect(backendEnvExample).toContain('FRONTEND_URL=http://localhost:8000');
    expect(backendEnvExample).toContain('STRIPE_SUCCESS_URL=http://localhost:8000/subscription/success');
    expect(backendEnvExample).not.toMatch(/localhost:5173/);
    expect(backendMainSource).toContain('http://localhost:${port}/api/metrics');
    expect(backendMainSource).not.toContain('http://localhost:${port}/metrics');
  });
});
