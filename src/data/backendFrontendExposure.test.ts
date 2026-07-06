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
import {
  BACKEND_ROUTE_EXPOSURE_POLICY,
  OPTIONAL_RUNTIME_ROUTE_EXPOSURE_POLICY,
  getOptionalRuntimeBackendRoutes,
} from './backendRouteExposurePolicy';
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
const HEAVY_EXPOSURE_SCAN_TIMEOUT_MS = 120_000;
const scanIt = (name: string, fn: () => void | Promise<void>) =>
  it(name, { timeout: HEAVY_EXPOSURE_SCAN_TIMEOUT_MS }, fn);

describe('backendFrontendExposure scan', () => {
  scanIt('passes with zero unguarded missing routes and no false executor claims', () => {
    const { ok, errors } = assertExposureScanPasses();
    expect(errors, errors.join('; ')).toEqual([]);
    expect(ok).toBe(true);
  });

  scanIt('inventory covers three POST executors', () => {
    const scan = runBackendFrontendExposureScan();
    expect(scan.executorNluIds).toEqual([...BACKEND_EXECUTOR_NLU_TOOL_IDS]);
    expect(scan.executorNluIds).toHaveLength(3);

    for (const id of BACKEND_EXECUTOR_NLU_TOOL_IDS) {
      expect(findBackendRoute('POST', `/api/tools/${id}/execute`)).toBeTruthy();
    }
  });

  scanIt('gates known missing routes behind disabled capabilities', () => {
    const gatedIds = [
      'tools-share-results',
      'team-users',
      'bulk-sync',
      'chat-messages-sync',
      'notifications-stream',
      'clinical-alerts-stream',
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

  scanIt('matches backend REGISTERED_EXECUTOR_TOOL_IDS in registry source', () => {
    const block = registrySource.match(/REGISTERED_EXECUTOR_TOOL_IDS\s*=\s*\[([\s\S]*?)\]\s*as const/);
    const backendIds = [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
    expect(backendIds).toEqual([...BACKEND_EXECUTOR_NLU_TOOL_IDS].sort());
  });

  scanIt('audit controller uses single /api prefix (not /api/api/audit)', () => {
    const auditRoutes = BACKEND_HTTP_ROUTES.filter((r) => r.controller === 'AuditController');
    expect(auditRoutes.every((r) => r.path.startsWith('/api/audit'))).toBe(true);
    expect(auditRoutes.some((r) => r.path.includes('/api/api/'))).toBe(false);
  });

  scanIt('every frontend inventory entry resolves exposure status', () => {
    expect(FRONTEND_API_CALLS.length).toBeGreaterThan(30);
    const scan = runBackendFrontendExposureScan();
    expect(scan.analyzed).toHaveLength(FRONTEND_API_CALLS.length);
    expect(scan.unguarded).toHaveLength(0);
  });

  scanIt('keeps frontend API call ids unique', () => {
    const ids = FRONTEND_API_CALLS.map((call) => call.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  scanIt('surfaces chat next-action and vitals endpoints through the canonical frontend inventory', () => {
    expect(FRONTEND_API_CALLS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ method: 'POST', path: '/api/chat/suggest-action' }),
        expect.objectContaining({ method: 'POST', path: '/api/chat/analyze-vitals' }),
      ])
    );
    expect(findBackendRoute('POST', '/api/chat/suggest-action')).toBeTruthy();
    expect(findBackendRoute('POST', '/api/chat/analyze-vitals')).toBeTruthy();
  });

  scanIt('covers protocol detail and compliance data export bridges', () => {
    const expectedCalls = [
      ['GET', '/api/protocols/:id'],
      ['POST', '/api/compliance/export'],
    ];

    for (const [method, path] of expectedCalls) {
      expect(FRONTEND_API_CALLS, `${method} ${path}`).toEqual(
        expect.arrayContaining([expect.objectContaining({ method, path })])
      );
      expect(findBackendRoute(method, path), `${method} ${path}`).toBeTruthy();
    }
  });

  scanIt('covers profile, workspace, activity, and personalization client calls', () => {
    const expectedUserIdentityCalls = [
      ['GET', '/api/profile/me'],
      ['PATCH', '/api/profile/me'],
      ['GET', '/api/profile/me/preferences'],
      ['PATCH', '/api/profile/me/preferences'],
      ['GET', '/api/profile/me/activity'],
      ['GET', '/api/profile/me/security'],
      ['GET', '/api/profile/me/workspaces'],
      ['PATCH', '/api/profile/me/workspaces/active'],
      ['GET', '/api/workspaces'],
      ['POST', '/api/workspaces'],
      ['POST', '/api/workspaces/active'],
      ['POST', '/api/activity'],
      ['GET', '/api/personalization/me'],
      ['PATCH', '/api/personalization/me'],
      ['POST', '/api/personalization/me/saved-prompts'],
    ];

    for (const [method, path] of expectedUserIdentityCalls) {
      expect(FRONTEND_API_CALLS, `${method} ${path}`).toEqual(
        expect.arrayContaining([expect.objectContaining({ method, path })])
      );
      expect(findBackendRoute(method, path), `${method} ${path}`).toBeTruthy();
    }
  });

  scanIt('classifies optional Mongoose CareDroid routes separately from always-mounted Nest routes', () => {
    const optionalRoutes = getOptionalRuntimeBackendRoutes();

    expect(optionalRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          method: 'POST',
          path: '/api/emergency/intake/sessions',
          runtime: 'mongoose-emergency-os',
        }),
      ])
    );
    expect(OPTIONAL_RUNTIME_ROUTE_EXPOSURE_POLICY['POST /api/emergency/intake/sessions']).toMatchObject({
      strategy: 'optional-runtime',
    });
    expect(BACKEND_ROUTE_EXPOSURE_POLICY['POST /api/emergency/intake/sessions']).toBeUndefined();
  });

  scanIt('gates optional CareDroid frontend calls when the optional runtime is disabled', () => {
    const scan = runBackendFrontendExposureScan();
    const optionalSmartIntakeIds = [
      'emergency-smart-intake-session-create',
      'emergency-smart-intake-manual-entry',
      'emergency-smart-intake-document',
      'emergency-smart-intake-ocr',
      'emergency-smart-intake-match',
      'emergency-smart-intake-verify-field',
      'emergency-smart-intake-link-patient',
      'emergency-smart-intake-create-patient',
      'emergency-smart-intake-continue-unknown',
      'emergency-smart-intake-ems-evidence',
      'emergency-smart-intake-reconcile-unknown',
      'emergency-smart-intake-biometric-consent',
      'emergency-smart-intake-biometric-consent-withdraw',
      'emergency-smart-intake-audit-log',
    ];

    expect(FRONTEND_API_CALLS).toEqual(
      expect.arrayContaining([
        ...optionalSmartIntakeIds.map((id) =>
          expect.objectContaining({
            id,
            capability: 'emergencySmartIntakeIdentitySession',
          })
        ),
        expect.objectContaining({ id: 'emergency-referral-create', capability: 'emergencyReferralPersistence' }),
      ])
    );
    for (const id of optionalSmartIntakeIds) {
      expect(scan.analyzed.find((row) => row.id === id)?.exposure).toBe('gated-stub');
    }
  });

  scanIt('covers memory dashboard and memory fabric client calls', () => {
    const memoryCalls = [
      ['GET', '/api/memory/dashboard'],
      ['POST', '/api/memory/short'],
      ['POST', '/api/memory/long'],
      ['POST', '/api/memory/clinical'],
      ['GET', '/api/memory/fabric/context'],
      ['POST', '/api/memory/fabric/signals'],
    ];

    for (const [method, path] of memoryCalls) {
      expect(FRONTEND_API_CALLS, `${method} ${path}`).toEqual(
        expect.arrayContaining([expect.objectContaining({ method, path, capability: 'memory' })])
      );
      expect(findBackendRoute(method, path), `${method} ${path}`).toBeTruthy();
    }
  });

  scanIt('covers demo-backed clinical alerts API routes while keeping stream gated', () => {
    const alertCalls = [
      ['GET', '/api/clinical/alerts'],
      ['POST', '/api/clinical/alerts/:id/acknowledge'],
      ['POST', '/api/clinical/alerts/:id/dismiss'],
    ];

    for (const [method, path] of alertCalls) {
      expect(FRONTEND_API_CALLS, `${method} ${path}`).toEqual(
        expect.arrayContaining([expect.objectContaining({ method, path, capability: 'clinicalAlerts' })])
      );
      expect(findBackendRoute(method, path), `${method} ${path}`).toBeTruthy();
    }

    const stream = runBackendFrontendExposureScan().analyzed.find((row) => row.id === 'clinical-alerts-stream');
    expect(stream?.exposure).toBe('gated-stub');
  });

  scanIt('classifies frontend, backend-only, planned, and executor capabilities', () => {
    const rows = buildBackendFrontendCapabilityRows();
    const classifications = new Set(rows.map((row) => row.classification));
    expect(classifications).toContain(BACKEND_FRONTEND_CAPABILITY_CLASSIFICATIONS.USER_FACING_WIRED);
    expect(classifications).toContain(BACKEND_FRONTEND_CAPABILITY_CLASSIFICATIONS.BACKEND_ONLY_INTERNAL);
    expect(classifications).toContain(BACKEND_FRONTEND_CAPABILITY_CLASSIFICATIONS.PLANNED_UNSUPPORTED);
    expect(
      rows.filter(
        (row) =>
          row.classification ===
          BACKEND_FRONTEND_CAPABILITY_CLASSIFICATIONS.USER_FACING_MISSING_FRONTEND_ROUTE
      )
    ).toEqual([]);
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
  it('serves frontend on port 5190 and proxies API/health/socket in dev and preview', () => {
    const vite = readViteDevConfig();
    expect(vite.devPort).toBe(5190);
    expect(vite.previewPort).toBe(5190);
    expect(vite.proxyTarget).toBe('http://localhost:3350');
    expect(vite.proxiesApi).toBe(true);
    expect(vite.proxiesHealth).toBe(true);
    expect(vite.proxiesSocketIo).toBe(true);
    expect(vite.serverUsesProxyHelper).toBe(true);
    expect(vite.previewUsesProxyHelper).toBe(true);
  });

  it('keeps local example URLs aligned to Vite dev port and metrics route', () => {
    expect(rootEnvExample).toContain('VITE_PRIVACY_POLICY_URL=http://localhost:5190/privacy');
    expect(rootEnvExample).toContain('GOOGLE_CALLBACK_URL=http://localhost:5190/api/auth/google/callback');
    expect(rootEnvExample).toContain('LINKEDIN_CALLBACK_URL=http://localhost:5190/api/auth/linkedin/callback');
    expect(rootEnvExample).not.toMatch(/localhost:5173/);
    expect(rootEnvExample).not.toMatch(/localhost:4173/);
    expect(backendEnvExample).toContain('FRONTEND_URL=http://localhost:5190');
    expect(backendEnvExample).toContain('GOOGLE_CALLBACK_URL=http://localhost:5190/api/auth/google/callback');
    expect(backendEnvExample).toContain('STRIPE_SUCCESS_URL=http://localhost:5190/subscription/success');
    expect(backendEnvExample).not.toMatch(/localhost:5173/);
    expect(backendEnvExample).not.toMatch(/localhost:4173/);
    expect(backendMainSource).toContain('http://localhost:${port}/api/metrics');
    expect(backendMainSource).not.toContain('http://localhost:${port}/metrics');
  });
});
