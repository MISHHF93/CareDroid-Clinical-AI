import { describe, expect, it } from 'vitest';
import {
  EMERGENCY_ARCHITECTURE_CLASSIFICATION,
  EMERGENCY_ARCHITECTURE_REGISTRY,
  listArchitectureArtifacts,
} from './emergencyArchitectureRegistry';

describe('emergencyArchitectureRegistry', () => {
  it('registers canonical role and screen artifacts', () => {
    const ids = EMERGENCY_ARCHITECTURE_REGISTRY.map((entry) => entry.id);
    expect(ids).toContain('emergency-role-permissions');
    expect(ids).toContain('emergency-role-screen-matrix');
    expect(ids).toContain('care-droid-central-node');
  });

  it('flags legacy and duplicate permission layers', () => {
    const duplicates = listArchitectureArtifacts(EMERGENCY_ARCHITECTURE_CLASSIFICATION.DUPLICATE);
    expect(duplicates.some((entry) => entry.id === 'utils-emergency-role-permissions')).toBe(true);
    const legacy = listArchitectureArtifacts(EMERGENCY_ARCHITECTURE_CLASSIFICATION.LEGACY);
    expect(legacy.some((entry) => entry.id === 'layout-app-shell')).toBe(true);
  });
});
