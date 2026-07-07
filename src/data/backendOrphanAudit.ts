/**
 * Orphan audit — backend-only routes, gated frontend calls, internal services.
 */

import {
  BACKEND_ROUTE_EXPOSURE_POLICY,
  getBackendOnlyRoutes,
  getBackendRouteExposureGaps,
  getFrontendGatedCalls,
  routePolicyKey,
} from './backendRouteExposurePolicy';
import { compareControllerScanToInventory } from './backendControllerRouteScan';
import { runBackendFrontendExposureScan } from './backendFrontendExposure';
import { BACKEND_EXECUTOR_NLU_TOOL_IDS } from '../config/backendApiCapabilities';
import { NLU_PROFILE_TOOL_IDS } from './clinicalToolIdContract';
import { isOrchestratorPostExecutable } from './unsupportedOrchestratorTools';

/** Internal Nest services (no direct HTTP from SPA). */
export const BACKEND_INTERNAL_SERVICES = Object.freeze([
  { symbol: 'RagService', module: 'modules/rag', strategy: 'backend-only', reason: 'Chat retrieval' },
  { symbol: 'EncryptionService', module: 'modules/encryption', strategy: 'backend-only', reason: 'At-rest crypto' },
  { symbol: 'CacheService', module: 'modules/cache', strategy: 'backend-only', reason: 'Redis layer' },
  { symbol: 'EmailService', module: 'modules/email', strategy: 'backend-only', reason: 'Transactional mail' },
  { symbol: 'EmergencyEscalationService', module: 'emergency-escalation', strategy: 'backend-only', reason: 'Chat pipeline' },
  { symbol: 'IntentClassifierService', module: 'intent-classifier', strategy: 'backend-only', reason: 'Via POST /api/chat/*' },
  { symbol: 'ToolOrchestratorService.executeInChat', module: 'tool-orchestrator', strategy: 'backend-only', reason: 'ChatService internal' },
  {
    symbol: 'FHIRService / MPIService / OCRService / TextMiningService',
    module: 'services + api/smart-intake.routes',
    strategy: 'optional-runtime',
    reason: 'Mounted only by the optional Mongoose CareDroid smart-intake workflow',
  },
  {
    symbol: 'LiveTrackingService legacy adapters',
    module: 'modules/live-tracking',
    strategy: 'legacy',
    reason:
      'Legacy source-compatibility adapters; active routes live on FleetController, HospitalMapController, and TelemetryController',
  },
  {
    symbol: 'EdgeAIAmbulanceService',
    module: 'services + api/ems.socket',
    strategy: 'backend-only',
    reason: 'CareDroid WebSocket support registered from backend startup',
  },
]);

export function assertNoOrphanedBackendFunctionality() {
  const errors = [] as any[];
  const scan = runBackendFrontendExposureScan();
  const controllerDiff = compareControllerScanToInventory();
  const policyGaps = getBackendRouteExposureGaps();

  if (scan.unguarded.length > 0) {
    errors.push(`Unguarded frontend calls: ${scan.unguarded.map((c) => c.id).join(', ')}`);
  }

  if (controllerDiff.missingInInventory.length > 0) {
    errors.push(
      `Controller routes missing from inventory: ${controllerDiff.missingInInventory
        .map((r) => `${r.method} ${r.path}`)
        .join(', ')}`
    );
  }

  if (controllerDiff.missingInControllers.length > 0) {
    errors.push(
      `Inventory routes not found in controllers: ${controllerDiff.missingInControllers
        .map((r) => `${r.method} ${r.path}`)
        .join(', ')}`
    );
  }

  for (const gap of policyGaps) {
    if (gap.issue === 'missing-policy') {
      errors.push(`Backend route without exposure policy: ${gap.key}`);
    }
    if (gap.issue === 'stale-policy') {
      errors.push(`Stale exposure policy (not in inventory): ${gap.key}`);
    }
  }

  return { ok: errors.length === 0, errors, scan, controllerDiff, policyGaps };
}

export function formatOrphanedBackendFunctionsMarkdown() {
  const backendOnly = getBackendOnlyRoutes();
  const gated = getFrontendGatedCalls();
  const byStrategy: any = { 'backend-only': [], 'expose-recommended': [], deferred: [] };

  for (const route of backendOnly) {
    const key = routePolicyKey(route.method, route.path);
    const policy = BACKEND_ROUTE_EXPOSURE_POLICY[key];
    const row = { key, controller: route.controller, ...policy };
    byStrategy[policy?.strategy ?? 'unknown'].push(row);
  }

  const nluWithoutExecutor = NLU_PROFILE_TOOL_IDS.filter((id) => !isOrchestratorPostExecutable(id));

  const lines = [
    '# Orphaned backend functions',
    '',
    `**Generated:** ${new Date().toISOString()}`,
    '',
    '> Regenerate: `npm run exposure:write-docs`',
    '',
    'Every backend HTTP route is either **wired** to a frontend client or listed below with an exposure strategy. Gated frontend calls (no Nest route) are tracked in section D.',
    '',
    '## A. Backend-only (correct)',
    '',
    '| Route | Controller | Reason |',
    '|-------|------------|--------|',
    ...byStrategy['backend-only'].map(
      (r) => `| \`${r.key.replace(/^\w+ /, '')}\` | ${r.controller} | ${r.reason} |`
    ),
    '',
    '### Internal services (no HTTP)',
    '',
    '| Symbol | Module | Reason |',
    '|--------|--------|--------|',
    ...BACKEND_INTERNAL_SERVICES.map((s) => `| \`${s.symbol}\` | \`${s.module}\` | ${s.reason} |`),
    '',
    '## B. Expose through SPA (recommended)',
    '',
    '| Route | Controller | Client hint |',
    '|-------|------------|-------------|',
    ...byStrategy['expose-recommended'].map(
      (r) =>
        `| \`${r.key.replace(/^\w+ /, '')}\` | ${r.controller} | ${r.clientHint ?? '—'} |`
    ),
    '',
    '## C. Deferred / admin / SSO',
    '',
    '| Route | Controller | Reason |',
    '|-------|------------|--------|',
    ...byStrategy.deferred.map(
      (r) => `| \`${r.key.replace(/^\w+ /, '')}\` | ${r.controller} | ${r.reason} |`
    ),
    '',
    '## D. Frontend calls without backend (gated)',
    '',
    '| ID | Method | Path | Capability | Client |',
    '|----|--------|------|------------|--------|',
    ...gated.map(
      (c) =>
        `| ${c.id} | ${c.method} | \`${c.path}\` | ${c.capability ?? '—'} | ${c.client} |`
    ),
    '',
    '## E. POST executors',
    '',
    `Registered: ${BACKEND_EXECUTOR_NLU_TOOL_IDS.map((id) => `\`${id}\``).join(', ')}`,
    '',
    `NLU profiles without POST executor (${nluWithoutExecutor.length}): client-side / chat only.`,
    '',
    '## F. Exposure strategy summary',
    '',
    '| Tier | Action |',
    '|------|--------|',
    '| P0 | Keep capability gates on phantom frontend paths until Nest implements or UI removed |',
    '| P1 | Keep `clinicalToolsApi` coverage for validate, catalog/executors, statistics |',
    '| P1 | Keep `complianceApi` coverage for consent, export, and delete-account |',
    '| P2 | Keep protocol/drug GET clients covered in the reference inventory |',
    '| P3 | Chat suggest-action / analyze-vitals on dashboard |',
    '',
    '## Quick counts',
    '',
    '| Category | Count |',
    '|----------|------:|',
    `| Backend HTTP routes | ${backendOnly.length + gated.length} |`,
    `| Wired frontend ? backend | ${gated.length ? 'see exposure report' : '—'} |`,
    `| Backend-only / deferred (policy) | ${backendOnly.length} |`,
    `| Gated frontend (no route) | ${gated.length} |`,
    `| POST executors | ${BACKEND_EXECUTOR_NLU_TOOL_IDS.length} |`,
    '',
  ];

  return lines.join('\n');
}
