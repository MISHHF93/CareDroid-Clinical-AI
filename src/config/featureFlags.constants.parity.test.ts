import { describe, expect, it } from 'vitest';
import { FEATURE_FLAG_CATEGORIES, FEATURE_FLAG_STATES } from '../../lib/featureFlags/constants';
import {
  FEATURE_FLAG_CATEGORIES as FRONTEND_CATEGORIES,
  FEATURE_FLAG_STATES as FRONTEND_STATES,
} from './featureFlags.config';

describe('feature flag constants parity', () => {
  it('keeps frontend projection aligned with shared lib constants', () => {
    expect(FRONTEND_STATES).toEqual(FEATURE_FLAG_STATES);
    expect(FRONTEND_CATEGORIES).toEqual(FEATURE_FLAG_CATEGORIES);
  });
});
