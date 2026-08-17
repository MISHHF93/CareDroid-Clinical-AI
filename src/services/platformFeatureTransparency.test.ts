import { describe, expect, it } from 'vitest';
import {
  applySimulationTransparencyOverride,
  buildPlatformFeatureTransparency,
  mapEnhancementMaturityToTransparency,
  summarizePlatformFeatureTransparency,
  worstMaturity,
} from './platformFeatureTransparency';
import { FEATURE_SUITE_ASSIGNMENTS } from '../../lib/features/suiteRegistry';

describe('platformFeatureTransparency', () => {
  it('maps enhancement maturity to transparency statuses', () => {
    expect(mapEnhancementMaturityToTransparency('live')).toBe('live');
    expect(mapEnhancementMaturityToTransparency('partial')).toBe('partial');
    expect(mapEnhancementMaturityToTransparency('demo')).toBe('demo');
    expect(mapEnhancementMaturityToTransparency('planned')).toBe('planned');
  });

  it('downgrades live and partial features to demo while simulation is active', () => {
    expect(applySimulationTransparencyOverride('live', true)).toBe('demo');
    expect(applySimulationTransparencyOverride('partial', true)).toBe('demo');
    expect(applySimulationTransparencyOverride('planned', true)).toBe('planned');
    expect(applySimulationTransparencyOverride('live', false)).toBe('live');
  });

  it('builds transparency entries for major platform surfaces', () => {
    const entries = buildPlatformFeatureTransparency({
      simulationActive: true,
      includeRegistryFeatures: false,
      includeFeatureFlags: false,
    });

    expect(entries.length).toBeGreaterThan(10);
    expect(entries.some((entry) => entry.id === 'whiteboard-operational-icons')).toBe(true);
    expect(entries.some((entry) => entry.effectiveStatus === 'demo')).toBe(true);
  });

  it('summarizes effective transparency counts', () => {
    const entries = buildPlatformFeatureTransparency({ simulationActive: true });
    const summary = summarizePlatformFeatureTransparency(entries);
    const total = summary.live + summary.demo + summary.partial + summary.planned;
    expect(total).toBe(entries.length);
  });

  // Regression coverage: suiteEntry() used to compute a suite's transparency
  // status from FEATURE_REGISTRY (an entirely different, parallel maturity
  // registry in featureRegistry.ts) rather than from FEATURE_SUITE_ASSIGNMENTS
  // (suiteRegistry.ts's own real, per-feature-detailed 87-entry registry) --
  // silently ignoring the real data whenever a suite's own features didn't all
  // happen to share the same maturity as whichever unrelated feature
  // FEATURE_REGISTRY.find() matched first.
  it("derives a suite's transparency status from its own real per-feature assignments, not an unrelated registry", () => {
    // reception_arrival's real assignments (suiteRegistry.ts):
    // reception_workspace: live, smart_intake: live, intake_ai_suggest: demo,
    // nlp_triage_expert_system: demo, voice_interview_assistant: preview.
    // Least-mature-first disclosure -> 'demo' is the honest suite-level status,
    // not 'live' (which would hide that 3 of 5 real assignments aren't live).
    const receptionAssignments = Object.values(FEATURE_SUITE_ASSIGNMENTS).filter(
      (a) => a.suiteId === 'reception_arrival',
    );
    expect(receptionAssignments.map((a) => a.maturity).sort()).toEqual(
      ['demo', 'demo', 'live', 'live', 'preview'].sort(),
    );

    const entries = buildPlatformFeatureTransparency({ simulationActive: false });
    const receptionEntry = entries.find((entry) => entry.id === 'reception_arrival');
    expect(receptionEntry).toBeDefined();
    expect(receptionEntry!.baseStatus).toBe('demo');
  });

  // Direct unit coverage for the aggregation rule itself, independent of
  // suiteRegistry.ts's current contents (which will keep changing) -- least-
  // mature-first, and a suite composed only of 'live' assignments reports 'live'.
  it('worstMaturity picks the least-mature label present, regardless of input order', () => {
    expect(worstMaturity(['live', 'live', 'live'])).toBe('live');
    expect(worstMaturity(['live', 'demo', 'live'])).toBe('demo');
    expect(worstMaturity(['live', 'preview', 'live'])).toBe('preview');
    expect(worstMaturity(['preview', 'demo'])).toBe('demo');
    expect(worstMaturity(['live', 'demo', 'preview', 'planned'])).toBe('planned');
    expect(worstMaturity([])).toBeUndefined();
  });
});