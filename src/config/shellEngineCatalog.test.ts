import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  SHELL_ENGINE_CATALOG,
  listAuthoritativeSessionEngines,
  listExperimentalShellEngines,
  resolveExperimentalShellEnginesEnabled,
  shouldStartShellEngine,
} from './shellEngineCatalog';

describe('shellEngineCatalog', () => {
  it('classifies every AppShell-started engine id', () => {
    const appShell = readFileSync(resolve(__dirname, '../components/AppShell.tsx'), 'utf8');
    const starters = [
      'startReassessmentEngine',
      'startCapacityEngine',
      'startContinuousPatientFlowEngine',
      'startAdministrativeAutomationEngine',
      'startUnifiedWorkflowAutomationEngine',
      'startUnifiedOperationalIntelligenceEngine',
      'startUnifiedApplicationKnowledgeGraphEngine',
      'startLivingDocumentationEngine',
    ];
    for (const name of starters) {
      expect(appShell).toContain(name);
    }
    expect(SHELL_ENGINE_CATALOG.map((e) => e.id)).toEqual(
      expect.arrayContaining([
        'reassessment',
        'capacity',
        'continuousPatientFlow',
        'administrativeAutomation',
        'unifiedWorkflowAutomation',
        'unifiedOperationalIntelligence',
        'unifiedApplicationKnowledgeGraph',
        'livingDocumentation',
        'alertsPoll',
      ]),
    );
  });

  it('marks experimental engines so prod can gate them', () => {
    const experimental = listExperimentalShellEngines().map((e) => e.id);
    expect(experimental).toEqual(
      expect.arrayContaining([
        'administrativeAutomation',
        'unifiedWorkflowAutomation',
        'unifiedOperationalIntelligence',
        'unifiedApplicationKnowledgeGraph',
        'livingDocumentation',
      ]),
    );
  });

  it('labels reassessment and capacity as authoritative but session-local', () => {
    const authSession = listAuthoritativeSessionEngines().map((e) => e.id);
    expect(authSession).toEqual(expect.arrayContaining(['reassessment', 'capacity', 'alertsPoll']));
    for (const engine of listAuthoritativeSessionEngines()) {
      expect(engine.durability).toBe('session');
      expect(engine.staleLabel || engine.label).toBeTruthy();
    }
  });

  it('does not claim durable durability without backend proof', () => {
    for (const engine of SHELL_ENGINE_CATALOG) {
      // Until workflow logs are proven durable, catalog must not lie.
      expect(engine.durability).toBe('session');
    }
  });

  it('defaults experimental engines OFF in production', () => {
    expect(
      resolveExperimentalShellEnginesEnabled({ PROD: true, MODE: 'production' }),
    ).toBe(false);
    expect(resolveExperimentalShellEnginesEnabled({ DEV: true })).toBe(true);
    expect(
      resolveExperimentalShellEnginesEnabled({
        PROD: true,
        VITE_ENABLE_EXPERIMENTAL_SHELL_ENGINES: 'true',
      }),
    ).toBe(true);
    expect(
      resolveExperimentalShellEnginesEnabled({
        DEV: true,
        VITE_ENABLE_EXPERIMENTAL_SHELL_ENGINES: 'false',
      }),
    ).toBe(false);
  });

  it('shouldStartShellEngine gates experimental engines and honors capability flags', () => {
    const caps = {
      showReassessmentEngine: true,
      showAdministrativeAutomationEngine: true,
      showOperationalIntelligenceEngine: true,
    };
    expect(shouldStartShellEngine('reassessment', caps, { experimentalEnabled: false })).toBe(
      true,
    );
    expect(
      shouldStartShellEngine('administrativeAutomation', caps, { experimentalEnabled: false }),
    ).toBe(false);
    expect(
      shouldStartShellEngine('administrativeAutomation', caps, { experimentalEnabled: true }),
    ).toBe(true);
    expect(
      shouldStartShellEngine('livingDocumentation', {}, { experimentalEnabled: false }),
    ).toBe(false);
    expect(
      shouldStartShellEngine('livingDocumentation', {}, { experimentalEnabled: true }),
    ).toBe(true);
    expect(shouldStartShellEngine('alertsPoll', {}, { experimentalEnabled: false })).toBe(true);
  });
});
