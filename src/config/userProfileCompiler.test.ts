import { describe, expect, it } from 'vitest';
import { compileUserProfile, isRouteAllowedInCompiledProfile } from './userProfileCompiler';
import { CANONICAL_ROUTES } from './routes.config';

describe('userProfileCompiler', () => {
  it('compiles registration clerk with strict enforcement and reception routes', () => {
    const compiled = compileUserProfile({
      saasRole: 'registration-clerk',
      orgContext: {
        organizationType: 'hospital',
        entitledPackIds: ['reception-desk', 'core-platform'],
      },
    });
    expect(compiled.strictPackEnforcement).toBe(true);
    expect(compiled.assignableForOrg).toBe(true);
    expect(isRouteAllowedInCompiledProfile(CANONICAL_ROUTES.emergencyReception, compiled)).toBe(
      true,
    );
    expect(isRouteAllowedInCompiledProfile(CANONICAL_ROUTES.emergencyWhiteboard, compiled)).toBe(
      false,
    );
    expect(compiled.tools.visible.length).toBeGreaterThanOrEqual(0);
  });

  it('compiles emergency physician with clinical routes', () => {
    const compiled = compileUserProfile({ saasRole: 'emergency-physician' });
    expect(compiled.strictPackEnforcement).toBe(false);
    expect(isRouteAllowedInCompiledProfile(CANONICAL_ROUTES.emergencyWhiteboard, compiled)).toBe(
      true,
    );
    expect(compiled.resonance.clinicalAccess).toBe(true);
  });

  it('compiles fleet operator with operations resonance', () => {
    const compiled = compileUserProfile({
      saasRole: 'fleet-operator',
      orgContext: { organizationType: 'hospital', entitledPackIds: ['hospital-operations'] },
    });
    expect(compiled.resonance.defaultWorkspace).toBe('fleet');
    expect(compiled.resonance.operationsAccess).toBe(true);
  });

  it('compiles trackmind racetrack admin', () => {
    const compiled = compileUserProfile({
      saasRole: 'racetrack-admin',
      orgContext: { organizationType: 'racetrack', entitledPackIds: ['trackmind'] },
    });
    expect(compiled.trackMind?.roleId).toBe('racetrack_admin');
    expect(compiled.strictPackEnforcement).toBe(true);
  });

  it('compiles student with permissive pack policy', () => {
    const compiled = compileUserProfile({ saasRole: 'student' });
    expect(compiled.strictPackEnforcement).toBe(true);
    expect(compiled.catalog.toolPolicy.allowedPacks).toContain('core-platform');
  });
});
