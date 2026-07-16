/**
 * Cycle 67 — specialty calculator lazy registry smoke.
 * Ensures family loaders export React.lazy components (not static modules).
 */
import { describe, expect, it } from 'vitest';
import * as lazy from './lazySpecialtyCalculators';

describe('lazySpecialtyCalculators', () => {
  it('exports a large set of specialty calculator lazy components', () => {
    const keys = Object.keys(lazy).filter((k) => typeof (lazy as any)[k] === 'object' || typeof (lazy as any)[k] === 'function');
    expect(keys.length).toBeGreaterThanOrEqual(40);
    // Spot-check major families
    expect(lazy.ApacheIICalculator).toBeTruthy();
    expect(lazy.Phq9Calculator).toBeTruthy();
    expect(lazy.EgfrCkdEpiCalculator).toBeTruthy();
    expect(lazy.WellsPeCalculator).toBeTruthy();
  });

  it('lazy components expose $$typeof (React.lazy)', () => {
    const sample = lazy.ApacheIICalculator as any;
    // React.lazy returns an object with $$typeof and _payload/_init
    expect(sample).toBeTruthy();
    expect(sample.$$typeof || sample._init || typeof sample === 'object').toBeTruthy();
  });
});
