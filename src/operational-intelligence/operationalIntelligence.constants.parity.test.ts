import { describe, expect, it } from 'vitest';
import {
  BLOCKED_AUTONOMOUS_OI_ACTIONS,
  CARE_DROID_OPERATIONAL_INTELLIGENCE_LAYER,
  OI_RULE_BASELINE_VERSION,
  OPERATIONAL_INTELLIGENCE_DISCLAIMERS,
} from '../../lib/operational-intelligence/constants';
import {
  BLOCKED_AUTONOMOUS_ACTIONS,
  CARE_DROID_OPERATIONAL_INTELLIGENCE_LAYER as FRONTEND_LAYER,
  OI_RULE_BASELINE_VERSION as FRONTEND_VERSION,
  OPERATIONAL_INTELLIGENCE_DISCLAIMERS as FRONTEND_DISCLAIMERS,
} from './operationalIntelligence.types';

describe('operational intelligence constants parity', () => {
  it('keeps frontend projection aligned with shared lib constants', () => {
    expect(FRONTEND_LAYER).toBe(CARE_DROID_OPERATIONAL_INTELLIGENCE_LAYER);
    expect(FRONTEND_VERSION).toBe(OI_RULE_BASELINE_VERSION);
    expect(FRONTEND_DISCLAIMERS).toEqual(OPERATIONAL_INTELLIGENCE_DISCLAIMERS);
    expect(BLOCKED_AUTONOMOUS_ACTIONS).toEqual(BLOCKED_AUTONOMOUS_OI_ACTIONS);
  });
});