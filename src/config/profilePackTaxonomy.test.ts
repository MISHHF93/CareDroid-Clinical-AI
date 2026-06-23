import { describe, expect, it } from 'vitest';
import {
  isStrictPackEnforcementForRole,
  packMatchesAllowedSet,
  resolveEffectivePacksForProfile,
  toolMatchesProfilePackPolicy,
} from './profilePackTaxonomy';

describe('profilePackTaxonomy', () => {
  it('expands catalog packs for emergency physician', () => {
    const packs = resolveEffectivePacksForProfile('emergency-physician');
    expect(packs).toContain('core-platform');
    expect(packs).toContain('emergency-clinical');
  });

  it('enforces strict pack policy for registration clerk', () => {
    expect(isStrictPackEnforcementForRole('registration-clerk')).toBe(true);
    expect(isStrictPackEnforcementForRole('emergency-physician')).toBe(false);
  });

  it('denies tools without packId in strict mode', () => {
    expect(
      toolMatchesProfilePackPolicy({ id: 'unknown-tool' }, 'registration-clerk', { strict: true }),
    ).toBe(false);
  });

  it('allows permissive mode for tools without packId', () => {
    expect(
      toolMatchesProfilePackPolicy({ id: 'unknown-tool' }, 'emergency-physician', { strict: false }),
    ).toBe(true);
  });

  it('matches emergency clinical pack on category', () => {
    expect(packMatchesAllowedSet('Emergency Medicine', ['emergency-clinical'])).toBe(true);
  });
});
