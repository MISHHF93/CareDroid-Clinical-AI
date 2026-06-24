import { describe, expect, it } from 'vitest';
import {
  getIntakeArtifact,
  listArtifactsByCategory,
  resolveArtifactFromFilename,
  resolveArtifactId,
} from './intakeArtifactRegistry';

describe('intakeArtifactRegistry', () => {
  it('returns a known artifact definition', () => {
    const artifact = getIntakeArtifact('health_card');
    expect(artifact.label).toBe('Health card');
    expect(artifact.extractableFields).toContain('healthCardNumber');
  });

  it('infers artifact type from filename hints', () => {
    expect(resolveArtifactFromFilename('patient_ohip_card.jpg').artifactId).toBe('health_card');
    expect(resolveArtifactFromFilename('discharge_summary_march.pdf').artifactId).toBe(
      'discharge_summary',
    );
  });

  it('prefers explicit artifact id when provided', () => {
    expect(resolveArtifactId('medication_list', 'random.jpg')).toBe('medication_list');
  });

  it('groups reception-visible artifacts by category', () => {
    const identity = listArtifactsByCategory('identity');
    expect(identity.some((artifact) => artifact.artifactId === 'passport')).toBe(true);
    expect(identity.every((artifact) => artifact.category === 'identity')).toBe(true);
  });
});