/**
 * Orchestrator mapping hardening — registry, Tier A/B, executors, unsupported classification.
 */

import { describe, it, expect } from 'vitest';
import { clinicalIntentTools } from './clinicalIntentToolCatalog';
import {
  REGISTRY,
  NLU,
  REGISTRY_ID_TO_ORCHESTRATOR_TOOL,
  ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
  CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS,
} from './clinicalToolIdContract';
import {
  classifyOrchestratorExecution,
  resolvePostExecutableNluId,
  runOrchestratorMappingAudit,
} from './orchestratorMappingAudit';
import {
  resolveOrchestratorToolForLaunch,
  resolveCatalogLaunch,
} from './clinicalCatalogWiring';
import { isOrchestratorPostExecutable } from './unsupportedOrchestratorTools';

describe('orchestratorMappingHardening — registry ↔ executor', () => {
  it('every REGISTRY_ID_TO_ORCHESTRATOR_TOOL value is a registered backend executor', () => {
    for (const nluId of Object.values(REGISTRY_ID_TO_ORCHESTRATOR_TOOL)) {
      expect(ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS).toContain(nluId);
      expect(isOrchestratorPostExecutable(nluId)).toBe(true);
    }
  });

  it('every registered executor resolves from registry id', () => {
    expect(resolvePostExecutableNluId(REGISTRY.drugCheck)).toBe(NLU.drugInteractions);
    expect(resolvePostExecutableNluId(REGISTRY.labInterp)).toBe(NLU.labInterpreter);
    expect(resolvePostExecutableNluId(REGISTRY.sofaScore)).toBe(NLU.sofaCalculator);
  });

  it('runOrchestratorMappingAudit passes with zero issues', () => {
    const report = runOrchestratorMappingAudit();
    expect(report.ok).toBe(true);
    expect(report.issues).toEqual([]);
  });
});

describe('orchestratorMappingHardening — Tier A calculators', () => {
  // As of 2026-07-13 the backend registers POST executors for a curated set of
  // Tier-A calculators (not just sofa-score) — see REGISTRY_ID_TO_EXECUTOR_TOOL_ID
  // in tool-orchestrator.registry.ts. This asserts wiring *consistency* (catalog
  // launch resolution agrees with the declared registry↔orchestrator map) rather
  // than a fixed allowlist, so it stays a real regression guard as more tools are
  // registered instead of going stale every time the backend adds one.
  it('Tier-A registry ids resolve a POST executor if and only if REGISTRY_ID_TO_ORCHESTRATOR_TOOL declares one', () => {
    for (const registryId of CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS) {
      const mapped = REGISTRY_ID_TO_ORCHESTRATOR_TOOL[registryId] ?? null;
      expect(resolveCatalogLaunch(registryId).orchestratorTool).toBe(mapped);
    }
  });

  it('sofa-score still maps to its registered executor', () => {
    expect(REGISTRY_ID_TO_ORCHESTRATOR_TOOL[REGISTRY.sofaScore]).toBe(NLU.sofaCalculator);
  });
});

describe('orchestratorMappingHardening — Tier B chat-assisted', () => {
  it('does not expose POST orchestrator for PERC or dispatch-ai launches', () => {
    for (const id of [REGISTRY.perc, REGISTRY.dispatchAi]) {
      expect(resolveCatalogLaunch(id).orchestratorTool).toBeNull();
      expect(resolveOrchestratorToolForLaunch(id, id, true)).toBeNull();
    }
  });

  it('Wells PE is now a registered POST executor, matching backend REGISTRY_ID_TO_EXECUTOR_TOOL_ID', () => {
    expect(resolveCatalogLaunch(REGISTRY.wellsPe).orchestratorTool).toBe(NLU.wellsPe);
  });

  it('dispatch-ai remains backend-routed in catalog but not POST-executable', () => {
    const row = clinicalIntentTools.find((t) => t.toolId === NLU.dispatchAi);
    expect(row?.backendRouted).toBe(true);
    expect(row?.postExecutable).toBe(false);
    expect(isOrchestratorPostExecutable(NLU.dispatchAi)).toBe(false);
  });
});

describe('orchestratorMappingHardening — unsupported classification', () => {
  it('classifies dispatch-ai as unsupported before network', () => {
    const c = classifyOrchestratorExecution(NLU.dispatchAi);
    expect(c.status).toBe('unsupported');
    expect(c.errorCode).toBe('UNSUPPORTED_TOOL');
  });

  it('classifies qsofa as unsupported', () => {
    expect(classifyOrchestratorExecution(NLU.qsofa).status).toBe('unsupported');
  });

  it('classifies registered tools as executable', () => {
    expect(classifyOrchestratorExecution(NLU.drugInteractions).status).toBe('executable');
    expect(classifyOrchestratorExecution(REGISTRY.drugCheck).status).toBe('executable');
  });

  it('classifies unknown ids as unknown', () => {
    expect(classifyOrchestratorExecution('not-a-real-tool-xyz').status).toBe('unknown');
  });
});
