import { describe, expect, it } from 'vitest';
import { AutomationEngine } from './automationEngine';

describe('AutomationEngine entitlement gating', () => {
  it('blocks automations when strict entitlements exclude the mapped asset', () => {
    const result = AutomationEngine.evaluateAutomation('emergency-automated-triage-matrix', {
      strictEntitlements: true,
      entitledAssetIds: ['calculators'],
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('not entitled');
  });

  it('allows automations when mapped clinical agent asset is entitled', () => {
    const result = AutomationEngine.evaluateAutomation('emergency-automated-triage-matrix', {
      strictEntitlements: true,
      entitledAssetIds: ['agent-clinical'],
    });
    expect(result.ok).toBe(true);
  });
});