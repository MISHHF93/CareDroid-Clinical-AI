/**
 * Orchestrator mapping audits — registry ? NLU ? backend POST executors.
 * Used by drift tests; does not register or fake backend tools.
 */

import { clinicalIntentTools } from './clinicalIntentToolCatalog';
import {
  CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS,
  REGISTRY,
  REGISTRY_ID_TO_ORCHESTRATOR_TOOL,
  ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
  ORCHESTRATOR_TO_REGISTRY_ID,
  TIER_B_CHAT_CALCULATOR_REGISTRY_IDS,
  NLU,
} from './clinicalToolIdContract';
import {
  isOrchestratorPostExecutable,
  UNSUPPORTED_ORCHESTRATOR_NLU_TOOL_IDS,
} from './unsupportedOrchestratorTools';

export const ORCHESTRATOR_ERROR_CODES = Object.freeze({
  UNSUPPORTED_TOOL: 'UNSUPPORTED_TOOL',
  TOOL_NOT_FOUND: 'TOOL_NOT_FOUND',
});

/** Resolve a registry or NLU id to a POST-executable NLU tool id, or null. */
export function resolvePostExecutableNluId(toolId) {
  if (!toolId) return null;
  const id = String(toolId).trim();
  if ((ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS as any).includes(id)) return id;
  const fromRegistry = REGISTRY_ID_TO_ORCHESTRATOR_TOOL[id];
  if (fromRegistry && (ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS as any).includes(fromRegistry)) {
    return fromRegistry;
  }
  return null;
}

/**
 * Classify a tool execution request before calling the network.
 * @param {string} toolId - NLU id, registry id, or alias
 * @returns {{ status: 'executable'|'unsupported'|'unknown', nluToolId?: string, requestedId: string, errorCode?: string, message: string }}
 */
export function classifyOrchestratorExecution(toolId) {
  const requestedId = String(toolId || '').trim();
  if (!requestedId) {
    return {
      status: 'unknown',
      requestedId: '',
      errorCode: ORCHESTRATOR_ERROR_CODES.TOOL_NOT_FOUND,
      message: 'Tool id is required.',
    };
  }

  const nluToolId = resolvePostExecutableNluId(requestedId);
  if (nluToolId) {
    return {
      status: 'executable',
      requestedId,
      nluToolId,
      message: `POST /api/tools/${nluToolId}/execute`,
    };
  }

  if ((UNSUPPORTED_ORCHESTRATOR_NLU_TOOL_IDS as any).includes(requestedId)) {
    return {
      status: 'unsupported',
      requestedId,
      errorCode: ORCHESTRATOR_ERROR_CODES.UNSUPPORTED_TOOL,
      message: `Tool "${requestedId}" is not available for server execution. Use the dedicated UI or chat workflow.`,
    };
  }

  if (ORCHESTRATOR_TO_REGISTRY_ID[requestedId] && !resolvePostExecutableNluId(requestedId)) {
    return {
      status: 'unsupported',
      requestedId,
      errorCode: ORCHESTRATOR_ERROR_CODES.UNSUPPORTED_TOOL,
      message: `Tool "${requestedId}" is not available for server execution.`,
    };
  }

  return {
    status: 'unknown',
    requestedId,
    errorCode: ORCHESTRATOR_ERROR_CODES.TOOL_NOT_FOUND,
    message: `No registered executor for tool "${requestedId}".`,
  };
}

/**
 * @returns {{ ok: boolean, issues: Array<{ code: string, detail: string }> }}
 */
export function auditRegistryOrchestratorMappings() {
  const issues = [] as any[];
  for (const [registryId, nluId] of Object.entries(REGISTRY_ID_TO_ORCHESTRATOR_TOOL)) {
    if (!ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS.includes(nluId)) {
      issues.push({
        code: 'registry-map-not-registered',
        detail: `${registryId} ? ${nluId} is not in ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS`,
      });
    }
    if (!isOrchestratorPostExecutable(nluId)) {
      issues.push({
        code: 'registry-map-not-post-executable',
        detail: `${registryId} ? ${nluId} fails isOrchestratorPostExecutable`,
      });
    }
  }
  for (const nluId of ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS) {
    const hasRegistry =
      Object.values(REGISTRY_ID_TO_ORCHESTRATOR_TOOL).includes(nluId) ||
      ORCHESTRATOR_TO_REGISTRY_ID[nluId];
    if (!hasRegistry) {
      issues.push({
        code: 'executor-without-registry-link',
        detail: `Registered executor ${nluId} has no REGISTRY_ID_TO_ORCHESTRATOR_TOOL or ORCHESTRATOR_TO_REGISTRY_ID entry`,
      });
    }
  }
  return { ok: issues.length === 0, issues };
}

/**
 * Tier-A calculators must not map to POST executors except SOFA (dual UI + executor).
 */
export function auditTierACalculatorExecutorLeaks() {
  const issues = [] as any[];
  const allowedTierAExecutor = new Set([REGISTRY.sofaScore]);
  for (const registryId of CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS) {
    if ((REGISTRY_ID_TO_ORCHESTRATOR_TOOL as any)[registryId] && !allowedTierAExecutor.has(registryId as any)) {
      issues.push({
        code: 'tier-a-false-executor-map',
        detail: `Tier-A calculator ${registryId} must not appear in REGISTRY_ID_TO_ORCHESTRATOR_TOOL`,
      });
    }
  }
  return { ok: issues.length === 0, issues };
}

/** Tier-B chat tools must not claim POST executability unless registered. */
export function auditTierBBackendExecutableClaims() {
  const issues = [] as any[];
  const tierBIds = new Set([
    ...TIER_B_CHAT_CALCULATOR_REGISTRY_IDS,
    REGISTRY.dispatchAi,
  ]);
  for (const row of clinicalIntentTools) {
    const registryId = row.sidebarToolId || row.toolId;
    if (!tierBIds.has(registryId as any) && row.toolId !== NLU.dispatchAi) continue;
    if (row.toolId === NLU.dispatchAi) {
      if (!row.backendRouted) {
        issues.push({
          code: 'dispatch-missing-chat-flag',
          detail: 'dispatch-ai should remain backend-routed for NLU/chat only',
        });
      }
      if (isOrchestratorPostExecutable(row.toolId)) {
        issues.push({
          code: 'dispatch-false-post-executor',
          detail: 'dispatch-ai must not be POST-orchestrator registered',
        });
      }
      continue;
    }
    if (row.postExecutable) {
      issues.push({
        code: 'tier-b-false-backend-executable',
        detail: `Tier-B tool ${row.toolId} must not set postExecutable: true without POST executor`,
      });
    }
    if (isOrchestratorPostExecutable(row.toolId)) {
      issues.push({
        code: 'tier-b-false-post-executor',
        detail: `Tier-B tool ${row.toolId} must not be POST-orchestrator registered`,
      });
    }
  }
  return { ok: issues.length === 0, issues };
}

/** backend routing in catalog is separate from POST executors. */
export function auditBackendExecutableCatalogFlags() {
  const issues = [] as any[];
  for (const row of clinicalIntentTools) {
    if (row.postExecutable && !isOrchestratorPostExecutable(row.toolId)) {
      issues.push({
        code: 'unexpected-post-executable',
        detail: `${row.toolId} has postExecutable:true but is not a registered POST executor`,
      });
    }
    if (isOrchestratorPostExecutable(row.toolId) && !row.postExecutable) {
      issues.push({
        code: 'executor-missing-backend-flag',
        detail: `${row.toolId} is POST-registered but postExecutable is false in catalog`,
      });
    }
  }
  return { ok: issues.length === 0, issues };
}

export function runOrchestratorMappingAudit() {
  const audits = [
    auditRegistryOrchestratorMappings(),
    auditTierACalculatorExecutorLeaks(),
    auditTierBBackendExecutableClaims(),
    auditBackendExecutableCatalogFlags(),
  ];
  const issues = audits.flatMap((a) => a.issues);
  return { ok: issues.length === 0, issues, audits };
}
