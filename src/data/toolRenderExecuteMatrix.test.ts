/**
 * Render / execute matrix validation — every registry tool has correct mode.
 */

import { describe, it, expect } from 'vitest';
import {
  ALL_REGISTRY_TOOL_IDS,
  REGISTRY,
  ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
} from './clinicalToolIdContract';
import {
  buildRenderExecuteMatrix,
  runRenderExecuteValidation,
  EXECUTION_MODES,
  executionModeForRegistry,
} from './toolRenderExecuteMatrix';
import { resolveCatalogLaunch } from './clinicalCatalogWiring';

describe('toolRenderExecuteMatrix', () => {
  it('covers every registry tool id', () => {
    const rows = buildRenderExecuteMatrix();
    expect(rows.map((r) => r.id).sort()).toEqual([...ALL_REGISTRY_TOOL_IDS].sort());
  });

  it('passes render/execute validation', () => {
    const result = runRenderExecuteValidation();
    expect(result.ok).toBe(true);
  });

  it('assigns POST mode only to Tier C registry tools', () => {
    for (const id of ['drug-check', 'lab-interp', 'sofa-score']) {
      expect(executionModeForRegistry(id)).toBe(EXECUTION_MODES.POST_EXECUTOR);
    }
    expect(executionModeForRegistry('qsofa')).toBe(EXECUTION_MODES.LOCAL_CALCULATOR);
    // wells-pe is now a registered backend executor (Tier C), so it renders
    // through POST /api/tools/:id/execute rather than the chat hub.
    expect(executionModeForRegistry('wells-pe')).toBe(EXECUTION_MODES.POST_EXECUTOR);
  });

  it('Tier B tools have chat seeds on launch', () => {
    // wells-pe and grace-acs are now registered backend executors (Tier C),
    // so they're no longer chat-only Tier B samples with a null orchestratorTool.
    for (const id of ['perc', 'dispatch-ai']) {
      const launch = resolveCatalogLaunch(id);
      expect(launch.chatSeed?.length).toBeGreaterThan(20);
      expect(launch.orchestratorTool).toBeNull();
    }
  });

  it('only registered NLU ids may be launch orchestrator tools', () => {
    for (const row of buildRenderExecuteMatrix()) {
      if (row.orchestratorToolId) {
        expect(ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS).toContain(row.orchestratorToolId);
      }
    }
  });

  it('local calculators do not require POST executor flag', () => {
    const local = buildRenderExecuteMatrix().filter(
      (r) => r.executionMode === EXECUTION_MODES.LOCAL_CALCULATOR
    );
    expect(local.length).toBeGreaterThan(10);
    for (const row of local) {
      if (row.id !== REGISTRY.sofaScore) {
        expect(row.backendPostExecutor).toBe(false);
      }
    }
  });
});
