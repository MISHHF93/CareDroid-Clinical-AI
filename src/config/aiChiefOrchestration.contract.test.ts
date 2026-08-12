import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AI_CHIEF_MONITORING_DOMAINS,
  AI_CHIEF_SAFETY_STATEMENT,
  listAiChiefBackendEndpoints,
} from './aiChiefOrchestrationModel';
import { buildAiChiefOrchestrationSnapshot } from '../services/aiChiefContinuousMonitoringService';

const ROOT = process.cwd();
const HOOK_SCAN_ROOTS = ['src/hooks', 'src/components', 'src/pages'];

const OPERATIONAL_INTELLIGENCE_IMPORT =
  /from\s+['"][^'"]*useOperationalIntelligenceCore['"]|import\s*\(\s*['"][^'"]*useOperationalIntelligenceCore['"]\s*\)/;

const ALLOWED_OI_CORE_IMPORTERS = new Set([
  'src/hooks/useOperationalIntelligenceCore.ts',
  'src/hooks/useAiChiefOrchestrator.ts',
  'src/hooks/useUnifiedOperationalIntelligence.ts',
  // useOperationalIntelligence.ts is itself a thin, single, well-known facade
  // over the core hook (HEAL-137) -- every real call site (Header, the
  // Whiteboard, EmergencyAnalytics, EmergencySettings, useNotificationCenter,
  // useHeaderOperationalMetrics) only ever read .centralSnapshot/.snapshot,
  // fields useAiChiefOrchestrator passed through from this same core hook
  // unmodified, so routing through the full orchestrator was silently
  // rebuilding the entire unified knowledge graph and AI recommendation
  // snapshot on every render of those consumers for no reason. Value-identical
  // to the old behavior, proven by direct regression test.
  'src/hooks/useOperationalIntelligence.ts',
]);

function listSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('aiChiefOrchestration contract', () => {
  it('covers all ten continuous monitoring domains with backend endpoints', () => {
    expect(AI_CHIEF_MONITORING_DOMAINS).toHaveLength(10);
    for (const domain of AI_CHIEF_MONITORING_DOMAINS) {
      expect(domain.backendEndpoints.length).toBeGreaterThan(0);
      expect(domain.signalSources.length).toBeGreaterThan(0);
    }
    expect(listAiChiefBackendEndpoints().length).toBeGreaterThan(10);
  });

  it('never allows AI outputs to replace clinician judgement', () => {
    const snapshot = buildAiChiefOrchestrationSnapshot();
    expect(AI_CHIEF_SAFETY_STATEMENT.replacesClinicianJudgment).toBe(false);
    expect(snapshot.safety.replacesClinicianJudgment).toBe(false);
    expect(snapshot.recommendations.every((rec) => rec.advisoryOnly && rec.humanReviewRequired)).toBe(
      true,
    );
    expect(snapshot.patientContexts.every((context) => context.humanReviewRequired)).toBe(true);
  });

  it('routes operational intelligence consumers through the single useOperationalIntelligence facade', () => {
    // Pre-HEAL-137 this hook delegated to useAiChiefOrchestrator, which
    // rebuilt the entire AI Chief snapshot + unified knowledge graph on every
    // render just to hand back two passthrough fields no real consumer used
    // beyond .centralSnapshot/.snapshot. It now delegates directly to the
    // lightweight useOperationalIntelligenceCore -- verified value-identical
    // to the old behavior in useOperationalIntelligence.test.ts. The
    // architectural intent this test guards (one single, well-known facade;
    // no consumer reaches past it to the low-level core hook directly) is
    // unchanged -- see the 'restricts direct useOperationalIntelligenceCore
    // imports' test below for that half of the contract.
    const orchestratorSource = readFileSync(
      path.join(ROOT, 'src/hooks/useOperationalIntelligence.ts'),
      'utf8',
    );
    expect(orchestratorSource).toContain('useOperationalIntelligenceCore');
  });

  it('does not re-enrich workflow tasks that already carry aiDecision in the local queue', () => {
    const source = readFileSync(
      path.join(ROOT, 'src/engine/administrativeAutomationEngine.ts'),
      'utf8',
    );
    expect(source).toContain('carryForwardAiDecisionsFromQueue');
    expect(source).toContain('administrativeAutomationQueue');
  });

  it('does not start a duplicate emergency realtime session from useCareDroidCentralNode', () => {
    const source = readFileSync(
      path.join(ROOT, 'src/hooks/useCareDroidCentralNode.ts'),
      'utf8',
    );
    expect(source).not.toContain('startEmergencyRealtime');
    expect(source).toContain('AppShell owns the singleton emergency realtime session');
  });

  it('restricts direct useOperationalIntelligenceCore imports to orchestrator internals', () => {
    const violations: string[] = [];
    for (const scanRoot of HOOK_SCAN_ROOTS) {
      for (const filePath of listSourceFiles(path.join(ROOT, scanRoot))) {
        const relative = path.relative(ROOT, filePath).replace(/\\/g, '/');
        if (ALLOWED_OI_CORE_IMPORTERS.has(relative)) continue;
        const source = readFileSync(filePath, 'utf8');
        if (OPERATIONAL_INTELLIGENCE_IMPORT.test(source)) {
          violations.push(relative);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('does not duplicate AI Chief recommendation engines in emergency route pages', () => {
    const emergencyRoutePages = readFileSync(
      path.join(ROOT, 'src/pages/emergency/emergencyRoutePages.tsx'),
      'utf8',
    );
    expect(emergencyRoutePages).not.toContain('buildAIRecommendations');
    expect(emergencyRoutePages).not.toContain('function AIChiefPanel');
    expect(emergencyRoutePages).toContain('AiChiefRouteRecommendationsPanel');
  });
});